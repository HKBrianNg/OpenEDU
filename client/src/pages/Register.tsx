// client/src/pages/Register.tsx

import { useState } from 'react';
import { Card, Form, Input, Button, App, Typography, Alert, Spin } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { useLocale } from '../store/LocaleContext';
import { useEmailCheck, useNicknameCheck, useRegister } from '../store/hooks/useAuth';

const { Title } = Typography;

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

export default function Register() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'error' | 'warning'>('error');
  const { t } = useLocale();
  const navigate = useNavigate();

  const { check: checkEmail, checking: emailChecking } = useEmailCheck();
  const { check: checkNickname, checking: nicknameChecking } = useNicknameCheck();
  const { register, loading } = useRegister();

  const onFinish = async (values: RegisterForm) => {
    // 格式与占用预检都由 Form rules 的 async validator 完成（onBlur 触发 + 缓存），
    // 提交时 AntD 会再跑一遍 rules，通过后才会到这里
    const result = await register({
      email: values.email,
      password: values.password,
      nickname: values.nickname,
    });

    if (result.ok) {
      message.success(t('auth.registerSuccess'));
      navigate('/login');
    } else {
      setErrorMsg(result.message || t('auth.registerFailed'));
      setErrorType('error');
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
            validateTrigger="onBlur"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
              // 失焦时实时查后台占用（hook 内置缓存，同值只查一次）
              () => ({
                validator(_, value: string) {
                  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return Promise.resolve();
                  }
                  return checkEmail(value).then((ok) =>
                    ok ? Promise.resolve() : Promise.reject(new Error(t('auth.emailExists'))),
                  );
                },
              }),
            ]}
          >
            <Input
              placeholder="you@example.com"
              suffix={<span style={{ display: 'inline-flex', width: 16 }}>{emailChecking ? <Spin size="small" /> : null}</span>}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.nickname')}
            name="nickname"
            validateTrigger="onBlur"
            rules={[
              { required: true, message: t('auth.nicknameRequired') },
              { min: 2, message: t('auth.nicknameMin') },
              () => ({
                validator(_, value: string) {
                  if (!value || value.trim().length < 2) {
                    return Promise.resolve();
                  }
                  return checkNickname(value).then((ok) =>
                    ok ? Promise.resolve() : Promise.reject(new Error(t('auth.nicknameExists'))),
                  );
                },
              }),
            ]}
          >
            <Input
              placeholder={t('auth.nicknamePlaceholder')}
              suffix={<span style={{ display: 'inline-flex', width: 16 }}>{nicknameChecking ? <Spin size="small" /> : null}</span>}
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
