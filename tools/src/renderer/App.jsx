// 骨架阶段：只验证「Electron 起来了 + preload 桥接通了 + antd 能渲染」。
// 真正的业务面板（知识库配图 / 视频字幕 / 歌曲）下一步再搬过来。

import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Space, Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export default function App() {
  const [env, setEnv] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // window.api 由 preload 注入；直接用 file:// 打开（没走 Electron）时它是 undefined
    if (!window.api) {
      setError('window.api 不存在 —— 这个页面必须由 Electron 加载，不是直接开 HTML');
      return;
    }
    window.api
      .env()
      .then(setEnv)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Title level={3}>OpenEDU Tools</Title>
      <Paragraph type="secondary">
        数据准备工具（作者端）：知识库配图、视频字幕、歌曲整理、git 提交。
      </Paragraph>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      <Card title="环境">
        {env ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Electron">{env.electron}</Descriptions.Item>
            <Descriptions.Item label="Node">{env.node}</Descriptions.Item>
            <Descriptions.Item label="Chrome">{env.chrome}</Descriptions.Item>
            <Descriptions.Item label="模式">
              {env.dev ? '开发（vite dev server）' : '构建产物'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">读取中…</Text>
        )}
      </Card>

      <Card title="骨架状态" style={{ marginTop: 16 }}>
        <Space direction="vertical">
          <Tag color="green">Electron 窗口</Tag>
          <Tag color="green">preload 桥接</Tag>
          <Tag color="green">antd 渲染</Tag>
          <Tag>知识库配图面板（下一版搬过来）</Tag>
          <Tag>视频字幕面板（下一版搬过来）</Tag>
        </Space>
      </Card>
    </div>
  );
}
