// client/src/pages/Login.tsx

import { Card, Form, Input, Button, App, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useLocale } from '../store/LocaleContext';
import { useLogin } from '../store/hooks/useAuth';

const { Title } = Typography;

export default function Login() {
  const { message } = App.useApp();
  const { login: doLogin, loading } = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuth } = useAuth();
  const { t } = useLocale();

  const infoMessage = location.state?.message || '';
  // ProtectedRoute 带来的原目标页（来路记忆），登录成功后跳回
  const from = (location.state as { from?: Location } | null)?.from?.pathname || '/';

  const onFinish = async (values: { email: string; password: string }) => {
    const result = await doLogin(values);

    if (result.ok) {
      if (result.token && result.user) {
        setAuth(result.token, result.user);
      }
      message.success(t('auth.loginSuccess'));
      navigate(from, { replace: true, state: {} });
    } else {
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        message.warning(t('auth.emailNotVerified'));
      } else if (result.code === 'ACCOUNT_DISABLED') {
        message.error(t('auth.accountDisabled'));
      } else {
        message.error(result.message || t('auth.loginFailed'));
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: 8 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 0, color: '#ff4d4f' }}>
            {t('auth.loginTitle')}
          </Title>

          {/* 显示提示信息（如注册成功提示） */}
          {infoMessage && (
            <div style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 4,
              padding: '8px 12px',
              color: '#52c41a'
            }}>
              {infoMessage}
            </div>
          )}

          <Form name="login" onFinish={onFinish} size="large" autoComplete="off">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: t('auth.emailRequired') },
                { type: 'email', message: t('auth.emailInvalid') }
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('auth.emailPlaceholder')} />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: t('auth.passwordRequired') }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t('auth.passwordPlaceholder')} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
              >
                {t('auth.loginButton')}
              </Button>
            </Form.Item>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/register">{t('auth.noAccount')}</Link>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
