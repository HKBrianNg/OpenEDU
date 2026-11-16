// desktop/src/pages/home/Register.tsx
import { useState } from 'react';
import { Card, Form, Input, Button, App, Typography, Alert, Spin, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../../store/LocaleContext';
import { useEmailCheck, useNicknameCheck, useRegister, useResendVerify } from '../../store/hooks/useAuth';

const { Title, Text } = Typography;

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
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { t } = useLocale();
  const navigate = useNavigate();

  const { check: checkEmail, checking: emailChecking } = useEmailCheck();
  const { check: checkNickname, checking: nicknameChecking } = useNicknameCheck();
  const { register, loading } = useRegister();
  const { resend, loading: resending } = useResendVerify();

  const onFinish = async (values: RegisterForm) => {
    const result = await register({
      email: values.email,
      password: values.password,
      nickname: values.nickname,
    });

    if (result.ok) {
      setRegisteredEmail(values.email);
      setErrorMsg('');
    } else {
      setErrorMsg(result.message || t('auth.registerFailed'));
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    const result = await resend(registeredEmail);
    if (result.ok) {
      message.success(t('auth.verifyEmailResent'));
    } else {
      message.error(result.message || t('auth.resendFailed'));
    }
  };

  // ✅ 注册成功后的状态页
  if (registeredEmail) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        <Card style={{ width: 420, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <Title level={3} style={{ marginBottom: 8 }}>
            {t('auth.verifyEmailTitle') || '验证邮件已发送'}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {t('auth.verifyEmailSent') || '我们已向'} <strong>{registeredEmail}</strong> {t('auth.verifyEmailSentSuffix') || '发送了一封验证邮件'}
          </Text>
          <Alert
            type="info"
            message={t('auth.verifyEmailHint') || '请查收邮件并点击验证链接完成注册'}
            showIcon
            style={{ marginBottom: 24, textAlign: 'left' }}
          />
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button onClick={() => navigate('/login')}>
              {t('auth.goToLogin') || '去登录'}
            </Button>
            <Button type="link" onClick={() => {
              setRegisteredEmail(null);
              form.resetFields();
            }}>
              {t('auth.registerAnother') || '注册其他账号'}
            </Button>
          </Space>
          <div style={{ marginTop: 16 }}>
            <Button type="link" size="small" onClick={handleResend} loading={resending}>
              {t('auth.resendVerifyEmail') || '没收到？重新发送'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ✅ 正常注册表单
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