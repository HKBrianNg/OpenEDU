// client/src/pages/Register.tsx

import { useState, useRef } from 'react';
import { Card, Form, Input, Button, App, Typography, Alert, Spin } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'error' | 'warning'>('error');
  const [emailChecking, setEmailChecking] = useState(false);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const { t } = useLocale();
  const navigate = useNavigate();

  // 缓存已检查过的值
  const emailCache = useRef(new Map<string, boolean>());
  const nicknameCache = useRef(new Map<string, boolean>());

  const checkEmail = async (email: string) => {
    // 命中缓存，直接返回
    if (emailCache.current.has(email)) {
      return emailCache.current.get(email);
    }

    setEmailChecking(true);

    try {
      const res = await fetch(`${API_BASE}/api/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      const available = data?.data?.available !== false;

      // 写入缓存
      emailCache.current.set(email, available);

      return available;
    } catch (e) {
      return true; // 网络错误时放行，让注册接口去判断
    } finally {
      setEmailChecking(false);
    }
  };

  const checkNickname = async (nickname: string) => {
    // 命中缓存，直接返回
    if (nicknameCache.current.has(nickname)) {
      return nicknameCache.current.get(nickname);
    }

    setNicknameChecking(true);

    try {
      const res = await fetch(`${API_BASE}/api/check-nickname?nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      const available = data?.data?.available !== false;

      // 写入缓存
      nicknameCache.current.set(nickname, available);

      return available;
    } catch (e) {
      return true; // 网络错误时放行，让注册接口去判断
    } finally {
      setNicknameChecking(false);
    }
  };

  const onFinish = async (values: RegisterForm) => {
    // 前端格式校验（AntD rules 已处理，这里兜底）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(values.email)) {
      form.setFields([{ name: 'email', errors: [t('auth.emailInvalid')] }]);
      return;
    }

    if (values.nickname.trim().length < 2) {
      form.setFields([{ name: 'nickname', errors: [t('auth.nicknameMin')] }]);
      return;
    }

    if (values.password !== values.confirmPassword) {
      form.setFields([{ name: 'confirmPassword', errors: [t('auth.passwordMismatch')] }]);
      return;
    }

    setLoading(true);

    // 后端预检
    const emailOk = await checkEmail(values.email);
    if (!emailOk) {
      form.setFields([{ name: 'email', errors: [t('auth.emailExists')] }]);
      setLoading(false);
      return;
    }

    const nicknameOk = await checkNickname(values.nickname);
    if (!nicknameOk) {
      form.setFields([{ name: 'nickname', errors: [t('auth.nicknameExists')] }]);
      setLoading(false);
      return;
    }

    // 全部通过，提交注册
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
        message.success(t('auth.registerSuccess'));
        navigate('/login');
      } else {
        setErrorMsg(data.message || t('auth.registerFailed'));
        setErrorType('error');
      }
    } catch (error) {
      setErrorMsg(t('auth.networkError'));
      setErrorType('error');
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

        {errorMsg && (
          <Alert
            type={errorType}
            message={errorMsg}
            showIcon
            closable
            onClose={() => setErrorMsg('')}
            style={{ marginTop: 16 }}
          />
        )}

        <Form 
          form={form}
          layout="vertical" 
          onFinish={onFinish} 
          size="large" 
          style={{ marginTop: 24 }}
        >
          <Form.Item
            label={t('auth.email')}
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
            ]}
          >
            <Input 
              placeholder="you@example.com" 
              suffix={emailChecking ? <Spin size="small" /> : null}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.nickname')}
            name="nickname"
            rules={[{ required: true, message: t('auth.nicknameRequired') }]}
          >
            <Input 
              placeholder={t('auth.nicknamePlaceholder')} 
              suffix={nicknameChecking ? <Spin size="small" /> : null}
            />
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