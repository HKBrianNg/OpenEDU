// OpenEDU Tools 主界面
//
// 管的是「本地仓库里的内容」：知识库配图、视频字幕、歌曲。
// 提交推送不在这里做 —— 用 VS Code 的 git 更顺手，也更可控。

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Layout, Space, Tabs, Typography, message } from 'antd';
import KnowledgeBasePanel from './KnowledgeBasePanel';
import TranscriptPanel from './TranscriptPanel';
import SongsPanel from './SongsPanel';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

export default function App() {
  const [env, setEnv] = useState(null);
  const [settings, setSettings] = useState(null);
  const [bridgeError, setBridgeError] = useState(null);

  useEffect(() => {
    if (!window.api) {
      setBridgeError('window.api 不存在 —— 这个页面必须由 Electron 加载，不能直接用浏览器打开 HTML');
      return;
    }
    window.api.env().then(setEnv).catch((e) => setBridgeError(String(e?.message ?? e)));
    window.api.settings().then(setSettings).catch((e) => setBridgeError(String(e?.message ?? e)));
  }, []);

  const pickDirectory = useCallback(async () => {
    const next = await window.api.pickDirectory();
    if (!next) return; // 取消了
    setSettings(next);
    message.success(`数据根目录：${next.dataRoot}`);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Space size="middle" align="center" style={{ height: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            OpenEDU Tools
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            数据根目录：{settings?.dataRoot ?? '读取中…'}
          </Text>
          <Button size="small" onClick={pickDirectory}>
            选择目录
          </Button>
          {env && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Electron {env.electron} / Node {env.node}
            </Text>
          )}
        </Space>
      </Header>

      <Content style={{ padding: 16 }}>
        {bridgeError ? (
          <Card>{bridgeError}</Card>
        ) : (
          <Card>
            <Tabs
              items={[
                {
                  key: 'kb',
                  label: '知识库配图',
                  children: <KnowledgeBasePanel dataRoot={settings?.dataRoot} />,
                },
                {
                  key: 'video',
                  label: '视频字幕',
                  children: <TranscriptPanel dataRoot={settings?.dataRoot} />,
                },
                {
                  key: 'songs',
                  label: '歌曲',
                  children: <SongsPanel dataRoot={settings?.dataRoot} />,
                },
              ]}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
