// desktop/src/pages/practice/Camera/index.tsx
//
// 手机相机（第一期：实时影像）。
//
// 连接流程（信令经主进程 ws 转发，媒体流 P2P 直连）：
//   手机页面 getUserMedia → 创建 offer → 主进程转发到这里
//   → setRemoteDescription → createAnswer → 主进程转回手机
//   → ICE 双向交换 → 手机相机画面通过 ontrack 显示在 <video> 里。
// 拍照/录像后续版本再加。
//
// 电脑可能有多块网卡（Wi-Fi / 有线 / 虚拟网卡），或在 app 启动之后才连上网络：
// 页面列出全部候选地址、支持重新检测，主进程网络变化时也会推送新的二维码地址。

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import QRCode from 'qrcode';
import { App, Input, Select, Tabs } from 'antd';
import { useLocale } from '../../../store/LocaleContext';

type RelayInfo = {
  url: string;
  port: number;
  ip: string;
  ips: string[];
  valid: boolean;
};

type Status = 'loading' | 'failed' | 'waiting' | 'connected' | 'closed';

export function CameraPage() {
  const { t } = useLocale();
  const { message } = App.useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  /** answer 之前手机端先到的 ICE 候选，等 pc 就绪后补上 */
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const loadRef = useRef<(attempt?: number) => Promise<void>>(async () => {});

  const [info, setInfo] = useState<RelayInfo | null>(null);
  const [qr, setQr] = useState<string>('');
  const [status, setStatus] = useState<Status>('loading');
  const [selectedIp, setSelectedIp] = useState('');
  /** WebRTC 真实连接状态，黑屏排查用 */
  const [diag, setDiag] = useState('');
  /** 手机横持时 iOS 的旋转元数据不一定被 <video> 应用，允许用户手动转 90° */
  const [rotation, setRotation] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** 录像状态（MediaRecorder 录的是桌面端收到的远端流） */
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);
  const recTimer = useRef<number | null>(null);
  /** OCR（拍摄画面文字识别） */
  const [ocrText, setOcrText] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  /** 语言档位：内容以什么为主就选什么，混猜最容易出乱码 */
  const [ocrLang, setOcrLang] = useState('chi_sim+eng');
  const [ocrLowQuality, setOcrLowQuality] = useState(false);
  const [ocrInfo, setOcrInfo] = useState<{ confidence: number; ms: number } | null>(null);
  /** 最近一张照片，用于框选识别 */
  const [ocrPhoto, setOcrPhoto] = useState<string | null>(null);
  const [ocrPhotoOpen, setOcrPhotoOpen] = useState(false);

  /** 旋转 90/270 时需要交换 video 的宽高，旋转后才正好铺满容器 */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rotated = rotation % 180 !== 0;
  const videoStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: box.w ? (rotated ? box.h : box.w) : '100%',
    height: box.h ? (rotated ? box.w : box.h) : '100%',
    objectFit: 'contain',
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  };

  useEffect(() => {
    let disposed = false;
    const ipc = window.ipcRenderer;

    const load = async (attempt = 0): Promise<void> => {
      const relay = (await ipc.invoke('camera:relay-info')) as RelayInfo | null;
      if (disposed) return;
      if (!relay) {
        // 主进程服务刚启动（生成证书需一两秒）时重试几次
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500));
          if (!disposed) return load(attempt + 1);
          return;
        }
        setStatus('failed');
        return;
      }
      setInfo(relay);
      setSelectedIp((prev) => (relay.ips.includes(prev) ? prev : relay.ip));
      setStatus('waiting');
    };
    loadRef.current = load;

    void load();
    void ipc.invoke('camera:attach');

    const setupPeer = (offerSdp: RTCSessionDescriptionInit) => {
      pcRef.current?.close();
      const pc = new RTCPeerConnection(); // 局域网直连，不需要 STUN/TURN
      pcRef.current = pc;

      pc.ontrack = (e) => {
        const video = videoRef.current;
        // 收到轨道不等于有画面：必须等 <video> 真正开始播放才算「已连接」
        const stream = e.streams[0] || new MediaStream([e.track]);
        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => {});
        }
        setDiag(`收到影像轨道 / WebRTC: ${pc.connectionState} / ICE: ${pc.iceConnectionState}`);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) ipc.send('camera:candidate', e.candidate.toJSON());
      };
      /** 状态诊断：ICE 不通（常见于热点隔离 / 跨网段）时从这里看出来 */
      const updateDiag = () => {
        setDiag(`WebRTC: ${pc.connectionState} / ICE: ${pc.iceConnectionState} / 轨道: ${pc.getReceivers().length}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus((s) => (s === 'connected' ? s : 'closed'));
        }
      };
      pc.onconnectionstatechange = updateDiag;
      pc.oniceconnectionstatechange = updateDiag;

      pendingCandidates.current.forEach((c) => {
        void pc.addIceCandidate(c).catch(() => {});
      });
      pendingCandidates.current = [];

      void pc
        .setRemoteDescription(offerSdp)
        .then(() => pc.createAnswer())
        .then((answer) => pc.setLocalDescription(answer))
        .then(() => {
          if (pcRef.current?.localDescription) {
            ipc.send('camera:answer', pcRef.current.localDescription.toJSON());
          }
        })
        .catch(() => setStatus('closed'));
    };

    const onOffer = (_e: unknown, sdp: RTCSessionDescriptionInit) => setupPeer(sdp);
    const onIce = (_e: unknown, candidate: RTCIceCandidateInit) => {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        void pc.addIceCandidate(candidate).catch(() => {});
      } else {
        pendingCandidates.current.push(candidate);
      }
    };
    const onPhoneClosed = () => {
      setStatus((s) => (s === 'connected' ? 'closed' : s));
    };
    const onPhoneOpened = () => {
      setStatus('waiting');
    };
    /** 电脑 IP 变了（后连 Wi-Fi / 换网络），主进程重签证书后推送新地址 */
    const onRelayChanged = () => {
      void load();
    };

    ipc.on('camera:offer', onOffer);
    ipc.on('camera:ice', onIce);
    ipc.on('camera:phone-closed', onPhoneClosed);
    ipc.on('camera:phone-opened', onPhoneOpened);
    ipc.on('camera:relay-changed', onRelayChanged);

    return () => {
      disposed = true;
      ipc.off('camera:offer', onOffer);
      ipc.off('camera:ice', onIce);
      ipc.off('camera:phone-closed', onPhoneClosed);
      ipc.off('camera:phone-opened', onPhoneOpened);
      ipc.off('camera:relay-changed', onRelayChanged);
      ipc.invoke('camera:detach').catch(() => {});
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, []);

  const displayUrl = info && info.valid && selectedIp ? `https://${selectedIp}:${info.port}/` : '';

  /** 拍照：截当前帧（含旋转前的原始方向），存 userData/captures */
  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      message.warning(t('camera.needVideo'));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const res = (await window.ipcRenderer.invoke('camera:save-photo', dataUrl)) as
      | { ok: boolean; file?: string; error?: string }
      | null;
    if (res?.ok && res.file) {
      message.success(`${t('camera.saved')}: ${res.file}`);
      // 拍好的照片直接送进 OCR 栏，可框选识别
      setOcrPhoto(dataUrl);
      setOcrPhotoOpen(true);
    } else message.error(res?.error || t('camera.needVideo'));
  };

  /** 录像：MediaRecorder 录桌面端收到的远端流，停止时整段写盘（webm） */
  const startRecording = () => {
    const video = videoRef.current;
    const stream = (video?.srcObject as MediaStream | null) || null;
    if (!stream || !stream.getVideoTracks().length) {
      message.warning(t('camera.needVideo'));
      return;
    }
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(
      (m) => MediaRecorder.isTypeSupported(m),
    );
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recChunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) recChunks.current.push(e.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(recChunks.current, { type: 'video/webm' });
      const buf = await blob.arrayBuffer();
      const res = (await window.ipcRenderer.invoke('camera:save-video', buf)) as
        | { ok: boolean; file?: string; error?: string }
        | null;
      if (res?.ok && res.file) message.success(`${t('camera.saved')}: ${res.file}`);
      else message.error(res?.error || t('camera.needVideo'));
    };
    rec.start(1000);
    recRef.current = rec;
    setRecSec(0);
    setRecording(true);
    recTimer.current = window.setInterval(() => setRecSec((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    if (recTimer.current) {
      window.clearInterval(recTimer.current);
      recTimer.current = null;
    }
    setRecording(false);
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    recRef.current = null;
  };

  /** OCR 识别一张图片 dataUrl（截帧与照片选区共用），引擎/语言档位 + 低质量提示 */
  const runOcrDataUrl = async (dataUrl: string) => {
    setOcrBusy(true);
    try {
      const res = (await window.ipcRenderer.invoke('camera:ocr-win', dataUrl, ocrLang)) as
        | { ok: boolean; text?: string; confidence?: number; lowQuality?: boolean; ms?: number; error?: string }
        | null;
      if (res?.ok) {
        setOcrText(res.text || '');
        setOcrLowQuality(!!res.lowQuality);
        setOcrInfo(
          typeof res.confidence === 'number' && typeof res.ms === 'number'
            ? { confidence: res.confidence, ms: res.ms }
            : null,
        );
        if (res.lowQuality) message.warning(t('camera.ocrLowQuality'));
        else if (res.text) message.success(`${((res.ms || 0) / 1000).toFixed(1)}s`);
        else message.info(t('camera.ocrEmpty'));
      } else {
        message.error(res?.error || t('camera.ocrEmpty'));
      }
    } finally {
      setOcrBusy(false);
    }
  };

  /** OCR：截当前帧（PNG 保真）交主进程 tesseract.js 识别 */
  const runOcr = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      message.warning(t('camera.needVideo'));
      return;
    }
    const canvas = document.createElement('canvas');
    // 适度放大让文字笔画更清楚，但限制在 1600 宽以内（超大图会让模型跑几十秒）
    const scale = Math.min(2, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      enhanceForOcr(ctx, canvas.width, canvas.height);
    }
    await runOcrDataUrl(canvas.toDataURL('image/png'));
  };

  const copyOcrText = async () => {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      message.success(t('camera.copied'));
    } catch {
      message.error(t('camera.copyText'));
    }
  };

  const saveOcrText = async () => {
    if (!ocrText) return;
    const res = (await window.ipcRenderer.invoke('camera:save-text', ocrText)) as
      | { ok: boolean; file?: string; error?: string }
      | null;
    if (res?.ok && res.file) message.success(`${t('camera.saved')}: ${res.file}`);
    else message.error(res?.error || t('camera.ocrEmpty'));
  };

  /** 组件卸载时停录像、清计时 */
  useEffect(
    () => () => {
      if (recTimer.current) window.clearInterval(recTimer.current);
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
    },
    [],
  );

  /** 二维码随选中的地址重生成；没有有效局域网地址时不生成，避免扫到 127.0.0.1 */
  useEffect(() => {
    if (!displayUrl) {
      setQr('');
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(displayUrl, { width: 232, margin: 1 }).then((dataUrl) => {
      if (!cancelled) setQr(dataUrl);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [displayUrl]);

  const statusText =
    status === 'failed'
      ? t('camera.httpsFailed')
      : status === 'connected'
      ? `✅ ${t('camera.connected')}`
      : status === 'closed'
      ? t('camera.disconnected')
      : `⏳ ${t('camera.waiting')}`;

  const recheckButton = (
    <button
      onClick={() => void loadRef.current()}
      style={{
        marginTop: 10,
        padding: '6px 14px',
        borderRadius: 6,
        border: '1px solid #91caff',
        background: '#e6f4ff',
        color: '#0958d9',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {t('camera.recheck')}
    </button>
  );

  return (
    <div style={{ height: '100vh', padding: '8px 16px 12px', boxSizing: 'border-box', background: '#f7fbff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        <style>{`
          .cam-fill-tabs { flex: 1; minHeight: 0; }
          .cam-fill-tabs .ant-tabs-content-holder { display: flex; minHeight: 0; }
          .cam-fill-tabs .ant-tabs-content { flex: 1; minHeight: 0; }
          .cam-fill-tabs .ant-tabs-tabpane { height: 100%; }
          .cam-fill-tabs .ant-tabs-tabpane-active { display: flex; }
        `}</style>
        <Tabs
          className="cam-fill-tabs"
          defaultActiveKey="connect"
          items={[
            {
              key: 'connect',
              label: `🔗 ${t('camera.tabConnect')}`,
              forceRender: true,
              children: (
                <div style={{ maxWidth: 420 }}>
            <div style={{ color: '#333', fontSize: 15, lineHeight: 2 }}>
              <div>{t('camera.step1')}</div>
              <div>{t('camera.step2')}</div>
              <div>{t('camera.step3')}</div>
            </div>

            {info && !info.valid && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  background: '#fff1f0',
                  border: '1px solid #ffa39e',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#cf1322',
                  lineHeight: 1.6,
                }}
              >
                {t('camera.noLan')}
                <div>{recheckButton}</div>
              </div>
            )}

            {qr && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <img
                  src={qr}
                  alt="QR"
                  style={{ width: 232, height: 232, borderRadius: 12, border: '1px solid #e3e9f2', background: '#fff' }}
                />
              </div>
            )}

            {displayUrl && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#666' }}>
                {t('camera.urlLabel')}
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: 'monospace',
                    fontSize: 15,
                    color: '#0958d9',
                    fontWeight: 600,
                  }}
                >
                  {displayUrl}
                </div>
              </div>
            )}

            {info && info.ips.length > 1 && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#666', lineHeight: 1.8 }}>
                <div>{t('camera.chooseIp')}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {info.ips.map((ip) => (
                    <button
                      key={ip}
                      onClick={() => setSelectedIp(ip)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 14,
                        border: `1px solid ${ip === selectedIp ? '#0958d9' : '#d9d9d9'}`,
                        background: ip === selectedIp ? '#e6f4ff' : '#fff',
                        color: ip === selectedIp ? '#0958d9' : '#555',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'monospace',
                      }}
                    >
                      {ip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 8 }}>{recheckButton}</div>

            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 8,
                fontSize: 13,
                color: '#ad6800',
                lineHeight: 1.6,
              }}
            >
              {t('camera.certHint')}
              <div style={{ marginTop: 4 }}>{t('camera.wifiHint')}</div>
            </div>
                </div>
              ),
            },
            {
              key: 'video',
              label: `🎥 ${t('camera.tabVideo')}`,
              forceRender: true,
              children: (
                <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap', flex: 1, minHeight: 0 }}>
              <div style={{ flex: '1 1 360px', minWidth: 320, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div
              ref={wrapRef}
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 160,
                background: '#101827',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid #dbe6f5',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onPlaying={() => setStatus('connected')}
                onLoadedData={() => setStatus('connected')}
                onEmptied={() => setStatus((s) => (s === 'connected' ? 'closed' : s))}
                style={videoStyle}
              />
              {status !== 'connected' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c9d6ea',
                    fontSize: 15,
                    gap: 8,
                    background: 'rgba(16,24,39,.55)',
                  }}
                >
                  <div style={{ fontSize: 44 }}>📷</div>
                  <div>{t('camera.noVideo')}</div>
                  <div style={{ color: '#8fa3c4', fontSize: 13 }}>{statusText}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: status === 'connected' ? '#389e0d' : '#888' }}>
                {statusText}
              </span>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  color: '#333',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                ⟳ {t('camera.rotate')}
              </button>
              {rotation !== 0 && (
                <button
                  onClick={() => setRotation(0)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {t('camera.resetRotation')}
                </button>
              )}
              <button
                onClick={() => void takePhoto()}
                disabled={status !== 'connected'}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: '1px solid #91caff',
                  background: status === 'connected' ? '#e6f4ff' : '#f5f5f5',
                  color: status === 'connected' ? '#0958d9' : '#bbb',
                  cursor: status === 'connected' ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                }}
              >
                📸 {t('camera.photo')}
              </button>
              {recording ? (
                <button
                  onClick={stopRecording}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #ff7875',
                    background: '#fff1f0',
                    color: '#cf1322',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  ⏹ {t('camera.stopRecord')}（{Math.floor(recSec / 60)}:{String(recSec % 60).padStart(2, '0')}）
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={status !== 'connected'}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #b7eb8f',
                    background: status === 'connected' ? '#f6ffed' : '#f5f5f5',
                    color: status === 'connected' ? '#389e0d' : '#bbb',
                    cursor: status === 'connected' ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                  }}
                >
                  ⏺ {t('camera.record')}
                </button>
              )}
              <button
                onClick={() => void window.ipcRenderer.invoke('camera:open-captures')}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  color: '#555',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                📂 {t('camera.openFolder')}
              </button>
            </div>
            {diag && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#999', fontFamily: 'monospace' }}>
                {diag}
              </div>
            )}
              </div>

              {/* OCR：识别结果（右侧栏，等高拉伸） */}
              <div style={{ flex: '0 0 380px', minWidth: 300, display: 'flex' }}>
            <div
              style={{
                padding: 16,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                border: '1px solid #e3e9f2',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => void runOcr()}
                  disabled={ocrBusy || status !== 'connected'}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: '1px solid #b37feb',
                    background: ocrBusy || status !== 'connected' ? '#f5f5f5' : '#f9f0ff',
                    color: ocrBusy || status !== 'connected' ? '#bbb' : '#722ed1',
                    cursor: ocrBusy || status !== 'connected' ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  🔍 {ocrBusy ? t('camera.ocrBusy') : t('camera.ocr')}
                </button>
                <Select
                  size="small"
                  value={ocrLang}
                  onChange={setOcrLang}
                  style={{ width: 132 }}
                  options={[
                    { value: 'chi_sim+eng', label: t('camera.ocrLangSc') },
                    { value: 'chi_tra+eng', label: t('camera.ocrLangTc') },
                    { value: 'eng', label: t('camera.ocrLangEn') },
                  ]}
                />

              </div>

              {ocrLowQuality && (
                <div style={{ marginTop: 10, color: '#ad6800', fontSize: 13 }}>
                  ⚠️ {t('camera.ocrLowQuality')}
                </div>
              )}

              <Input.TextArea
                value={ocrText}
                readOnly
                placeholder={ocrBusy ? t('camera.ocrBusy') : t('camera.ocrEmpty')}
                style={{ marginTop: 12, fontFamily: 'monospace', flex: 1, minHeight: 140 }}
              />

              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => void copyOcrText()}
                  disabled={!ocrText}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    color: ocrText ? '#333' : '#bbb',
                    cursor: ocrText ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                  }}
                >
                  📋 {t('camera.copyText')}
                </button>
                <button
                  onClick={() => void saveOcrText()}
                  disabled={!ocrText}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    color: ocrText ? '#333' : '#bbb',
                    cursor: ocrText ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                  }}
                >
                  💾 {t('camera.saveText')}
                </button>
                {ocrInfo && (
                  <span style={{ fontSize: 12, color: '#999', fontFamily: 'monospace' }}>
                    {ocrInfo.confidence}% · {(ocrInfo.ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {/* 照片框选识别 */}
              <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                <button
                  onClick={() => setOcrPhotoOpen((v) => !v)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    color: '#555',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  📷 {t('camera.ocrPhotoTitle')} {ocrPhotoOpen ? '▾' : '▸'}
                </button>
                {ocrPhotoOpen && (
                  <div style={{ marginTop: 10 }}>
                    {ocrPhoto ? (
                      <PhotoOcr
                        photo={ocrPhoto}
                        busy={ocrBusy}
                        t={t}
                        onRecognize={(d) => void runOcrDataUrl(d)}
                      />
                    ) : (
                      <div style={{ fontSize: 12, color: '#aaa' }}>{t('camera.ocrPhotoHint')}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
              </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

CameraPage.displayName = 'CameraPage';

/** 灰度 + 对比度拉伸：白底黑字在杂色背景上识别率明显提升（截帧与照片选区共用） */
function enhanceForOcr(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, Math.min(255, (g - 128) * 1.35 + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
  } catch {
    /* 取像素失败就用原图 */
  }
}

type OcrSel = { x: number; y: number; w: number; h: number };

/** 照片框选识别：在照片上拖出矩形，按原图比例裁剪后送 OCR */
function PhotoOcr({
  photo,
  busy,
  t,
  onRecognize,
}: {
  photo: string;
  busy: boolean;
  t: (k: string) => string;
  onRecognize: (dataUrl: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<OcrSel | null>(null);
  const dragRef = useRef<{ sx: number; sy: number } | null>(null);

  const relPos = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  };

  const onDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const p = relPos(e);
    dragRef.current = { sx: p.x, sy: p.y };
    setSel({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = relPos(e);
    setSel({
      x: Math.min(drag.sx, p.x),
      y: Math.min(drag.sy, p.y),
      w: Math.abs(p.x - drag.sx),
      h: Math.abs(p.y - drag.sy),
    });
  };
  const onUp = () => {
    dragRef.current = null;
    setSel((s) => (s && s.w >= 8 && s.h >= 8 ? s : null));
  };

  const recognizeSelection = () => {
    const wrap = wrapRef.current;
    const img = wrap?.querySelector('img') as HTMLImageElement | null;
    if (!wrap || !img || !sel || sel.w < 8 || sel.h < 8) return;
    const shownW = img.getBoundingClientRect().width;
    const shownH = img.getBoundingClientRect().height;
    const sx = img.naturalWidth / shownW;
    const sy = img.naturalHeight / shownH;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sel.w * sx);
    canvas.height = Math.round(sel.h * sy);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      sel.x * sx,
      sel.y * sy,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    enhanceForOcr(ctx, canvas.width, canvas.height);
    onRecognize(canvas.toDataURL('image/png'));
  };

  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'center', background: '#f4f6fa', borderRadius: 8, overflow: 'hidden' }}
      >
        <div
          ref={wrapRef}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          style={{ position: 'relative', lineHeight: 0, cursor: 'crosshair', userSelect: 'none' }}
        >
          <img src={photo} alt="photo" draggable={false} style={{ maxHeight: 200, maxWidth: '100%', display: 'block' }} />
          {sel && (
            <div
              style={{
                position: 'absolute',
                left: sel.x,
                top: sel.y,
                width: sel.w,
                height: sel.h,
                border: '2px solid #722ed1',
                background: 'rgba(114,46,209,.12)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={recognizeSelection}
          disabled={busy || !sel}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid #b37feb',
            background: busy || !sel ? '#f5f5f5' : '#f9f0ff',
            color: busy || !sel ? '#bbb' : '#722ed1',
            cursor: busy || !sel ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          🔍 {busy ? t('camera.ocrBusy') : t('camera.ocrRecognizeSel')}
        </button>
        {sel && (
          <button
            onClick={() => setSel(null)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid #d9d9d9',
              background: '#fff',
              color: '#888',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {t('camera.ocrClearSel')}
          </button>
        )}
        <span style={{ fontSize: 12, color: '#aaa' }}>{t('camera.ocrSelectHint')}</span>
      </div>
    </div>
  );
}
