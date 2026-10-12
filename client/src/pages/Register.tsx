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

    // 后端预检
    const emailOk = await checkEmail(values.email);
    if (!emailOk) {
      form.setFields([{ name: 'email', errors: [t('auth.emailExists')] }]);
      return;
    }

    const nicknameOk = await checkNickname(values.nickname);
    if (!nicknameOk) {
      form.setFields([{ name: 'nickname', errors: [t('auth.nicknameExists')] }]);
      return;
    }

    // 全部通过，提交注册
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
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
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
            rules={[{ required: true, message: t('auth.nicknameRequired') }]}
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
