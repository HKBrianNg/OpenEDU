// desktop/src/pages/home/Register.tsx
import { useState } from 'react';
import { Card, Form, Input, Button, App, Typography, Alert, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../../store/LocaleContext';
import { useEmailCheck, useNicknameCheck, useRegister } from '../../store/hooks/useAuth';

const { Title } = Typography;

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

export function Register() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [errorMsg, setErrorMsg] = useState('');
  const { t } = useLocale();
  const navigate = useNavigate();

  const { check: checkEmail, checking: emailChecking } = useEmailCheck();
  const { check: checkNickname, checking: nicknameChecking } = useNicknameCheck();
  const { register, loading } = useRegister();

  const onFinish = async (values: RegisterForm) => {
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
        <Title level={3} style={{ textAlign: 'center', marginBottom: 0 }}>
          {t('auth.registerTitle')}
        </Title>

        {errorMsg && (
          <Alert
            type="error"
            message={errorMsg}
            showIcon
            closable
            onClose={() => setErrorMsg('')}
            style={{ marginTop: 16, marginBottom: 0 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t('auth.email')}
            name="email"
            validateTrigger="onBlur"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
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
            style={{ marginBottom: 10 }}
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
            style={{ marginBottom: 10 }}
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
            style={{ marginBottom: 10 }}
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
            style={{ marginBottom: 10 }}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('auth.register')}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a onClick={() => navigate('/')}>{t('auth.haveAccount')}</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}