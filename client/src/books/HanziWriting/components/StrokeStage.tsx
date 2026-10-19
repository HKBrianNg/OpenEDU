import { useEffect, useRef, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import type HanziWriter from 'hanzi-writer';
import { useHanziWriter } from '../hooks/useHanziWriter';
import PracticeGrid from './PracticeGrid';
import type { HanziChar, ScriptMode } from '../types';
import { charOf, strokesOf } from '../constants';
import { useLocale } from '../../../store/LocaleContext';

const { Text } = Typography;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface StrokeStageProps {
  entry: HanziChar;
  script: ScriptMode;
  size: number;
  /** 越大越快，1 是库默认速度 */
  speed: number;
  resetKey: number;
  onReset: () => void;
}

/**
 * 笔顺演示：灰色轮廓打底，一笔一笔把字写出来。
 * 切到新字（或点「重写一遍」）会自动放一遍，娃不用点按钮就能看见怎么写。
 */
export default function StrokeStage({
  entry,
  script,
  size,
  speed,
  resetKey,
  onReset,
}: StrokeStageProps) {
  const { t } = useLocale();
  // 繁体的笔画数比简体多，演示进度要按实际写法算
  const char = charOf(entry, script);
  const total = strokesOf(entry, script);

  const [drawn, setDrawn] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const stopRef = useRef(false);
  const pauseRef = useRef(false);

  const playFrom = async (writer: HanziWriter, from: number, count: number) => {
    if (!total) return;
    stopRef.current = false;
    pauseRef.current = false;
    setPaused(false);
    setPlaying(true);

    for (let i = from; i < Math.min(from + count, total); i += 1) {
      if (stopRef.current) break;
      await writer.animateStroke(i);
      if (stopRef.current) break;
      setDrawn(i + 1);
      // 暂停就卡在这儿等，点「继续」再往下走
      while (pauseRef.current && !stopRef.current) await sleep(80);
      if (stopRef.current) break;
      await sleep(150);
    }

    setPlaying(false);
  };

  const { containerRef, writerRef } = useHanziWriter({
    char,
    grade: entry.grade,
    script,
    size,
    showOutline: true,
    showCharacter: false,
    strokeAnimationSpeed: speed,
    resetKey,
    // 实例一建好就从头写一遍，省得娃还得找按钮
    onReady: (writer) => {
      void playFrom(writer, 0, total);
    },
  });

  // 组件被换掉（切字、切模式）时把循环停掉，别让旧的动画接着跑
  useEffect(
    () => () => {
      stopRef.current = true;
    },
    [],
  );

  const playAll = () => {
    const writer = writerRef.current;
    if (writer) void playFrom(writer, 0, total);
  };

  const stepOne = () => {
    const writer = writerRef.current;
    if (writer) void playFrom(writer, drawn, 1);
  };

  const togglePause = () => {
    const next = !paused;
    pauseRef.current = next;
    setPaused(next);
    if (next) void writerRef.current?.pauseAnimation();
    else void writerRef.current?.resumeAnimation();
  };

  return (
    <div>
      <PracticeGrid size={size}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      </PracticeGrid>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          <Button type="primary" onClick={playAll} disabled={playing || !total}>
            {t('hanziwriting.play')}
          </Button>
          <Button onClick={togglePause} disabled={!playing}>
            {paused ? t('hanziwriting.resume') : t('hanziwriting.pause')}
          </Button>
          <Button onClick={stepOne} disabled={playing || drawn >= total}>
            {t('hanziwriting.stepOne')}
          </Button>
          <Button onClick={onReset}>{t('hanziwriting.reset')}</Button>
        </Space>

        <Text type="secondary">
          {t('hanziwriting.drawn')} <b>{drawn} / {total}</b>
        </Text>
      </div>
    </div>
  );
}
