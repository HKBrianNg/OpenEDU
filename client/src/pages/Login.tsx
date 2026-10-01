// client/src/pages/Login.tsx

import { useState } from 'react';
import { Card, Form, Input, Button, App, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useLocale } from '../store/LocaleContext';

const { Title } = Typography;

// 从环境变量读取后台地址
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLocale();

  // 修复 TS6133：直接获取提示信息，不再声明无用的 setInfoMessage
  const infoMessage = location.state?.message || '';

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.data.token, data.data.user);
        message.success(t('auth.loginSuccess'));
        // 登录成功后清除 state 中的提示信息（避免后退时残留）
        navigate('/', { replace: true, state: {} });
      } else {
        // 处理特殊状态（结合 VerifyEmail 流程）
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          message.warning(t('auth.emailNotVerified'));
        } else if (data.code === 'ACCOUNT_DISABLED') {
          message.error(t('auth.accountDisabled'));
        } else {
          message.error(data.message || t('auth.loginFailed'));
        }
      }
    } catch (e) {
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