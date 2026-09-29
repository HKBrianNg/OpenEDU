// client/src/pages/Register.tsx

import { useState } from 'react';
import { Card, Form, Input, Button, App, Typography } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useLocale } from '../store/LocaleContext';

const { Title } = Typography;
const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

export default function Register() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();

  const onFinish = async (values: RegisterForm) => {
    if (values.password !== values.confirmPassword) {
      message.error(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          nickname: values.nickname,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        // 注册成功后自动登录
        await login(data.data.token, data.data.user);
        message.success(t('auth.registerSuccess'));
        navigate('/');
      } else {
        message.error(data.message || t('auth.registerFailed'));
      }
    } catch (error) {
      message.error(t('auth.networkError'));
    } finally {
      setLoading(false);
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
        <Title level={3} style={{ textAlign: 'center', marginBottom: 0, color: '#ff4d4f' }}>
          {t('auth.registerTitle')}
        </Title>
        <Form layout="vertical" onFinish={onFinish} size="large" style={{ marginTop: 24 }}>
          <Form.Item
            label={t('auth.email')}
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label={t('auth.nickname')}
            name="nickname"
            rules={[{ required: true, message: t('auth.nicknameRequired') }]}
          >
            <Input placeholder={t('auth.nicknamePlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('auth.password')}
            name="password"
            rules={[
              { required: true, message: t('auth.passwordRequired') },
              { min: 8, message: t('auth.passwordMin') },
            ]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item
            label={t('auth.confirmPassword')}
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: t('auth.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
            >
              {t('auth.register')}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/login">{t('auth.haveAccount')}</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}