// tools/src/renderer/LoginPage.jsx
// 登录页：从主界面点「登录」，或点「后台管理」时弹出来（见 App.jsx）。
//
// 要用**后台的管理员账号**登录 —— 普通账号也能换到 token，
// 但调不动 /api/users、/api/admin/logs；而桌面端的定位就是作者端，
// 本来也只有你自己在用，不区分角色了。
//
// 后台地址不在这里显示：它跟数据根目录一样是配置项，写在 settings.json 里，
// 留空就用默认的 worker 地址。

import { useState } from 'react';
import { Alert, App as AntApp, Button, Card, Input, Space, Spin, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useSession } from './SessionContext';
import { useI18n } from './LocaleProvider';

const { Title, Text } = Typography;

// hint：为什么被弹出来（点了「后台管理」/ token 过期），没有就是用户主动点「登录」
// onSuccess / onCancel：登完或放弃，都交回外壳决定去哪
export default function LoginPage({ hint, onSuccess, onCancel } = {}) {
  const { message } = AntApp.useApp();
  const { settings, login } = useSession();
  const { t } = useI18n();
  const [email, setEmail] = useState(settings?.adminEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      message.warning(t('Login.required'));
      return;
    }
    setLoading(true);
    try {
      const user = await login(email, password);
      message.success(`${t('Login.success')}：${user?.nickname || user?.email || email}`);
      onSuccess?.();
    } catch (e) {
      message.error(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: 400 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              OpenEDU Tools
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('Login.subtitle')}
            </Text>
          </div>

          {hint && <Alert type="info" showIcon message={hint} />}

          {settings === null ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Spin />
            </div>
          ) : (
            <>
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder={t('Login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onPressEnter={submit}
              />
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder={t('Login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPressEnter={submit}
              />
              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={submit}
              >
                {t('Login.submit')}
              </Button>
              {onCancel && (
                <Button size="large" block onClick={onCancel}>
                  {t('Login.back')}
                </Button>
              )}
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
