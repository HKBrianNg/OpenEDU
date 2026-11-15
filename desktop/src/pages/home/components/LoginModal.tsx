// desktop/src/pages/home/components/LoginModal.tsx
import { Form, Input, Button, Modal, Typography, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../../../store/LocaleContext';
import { useLogin } from '../../../store/hooks/useAuth';
import { useAuth } from '../../../store/AuthContext';

const { Title } = Typography;

type LoginFormValues = {
  email: string;
  password: string;
};

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const { t } = useLocale();
  const { message: msg } = App.useApp();
  const { login: setAuth } = useAuth();
  const { login, loading } = useLogin();
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();

  const onFinish = async (values: LoginFormValues) => {
    const result = await login(values);

    if (result.ok && result.token && result.user) {
      setAuth(result.token, result.user);
      msg.success(t('auth.loginSuccess'));
      form.resetFields();
      onClose();
      onSuccess?.();
    } else {
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        msg.warning(t('auth.emailNotVerified') || 'Please verify your email first');
      } else if (result.code === 'ACCOUNT_DISABLED') {
        msg.error(t('auth.accountDisabled') || 'Account disabled');
      } else {
        msg.error(result.message || t('auth.loginFailed'));
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={440}
      destroyOnHidden
    >
      <Title level={2} style={{ textAlign: 'center', marginBottom: 28 }}>
        {t('auth.loginTitle')}
      </Title>
      <Form
        form={form}
        name="login-modal"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
          name="email"
          label={t('auth.email')}
          rules={[
            { required: true, message: t('auth.emailRequired') },
            { type: 'email', message: t('auth.emailInvalid') }
          ]}
        >
          <Input prefix={<UserOutlined />} size="large" placeholder={t('auth.emailPlaceholder')} />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('auth.password')}
          rules={[{ required: true, message: t('auth.passwordRequired') }]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" placeholder={t('auth.passwordPlaceholder')} />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            {t('auth.loginButton')}
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          <span style={{ marginRight: 4 }}>{t('auth.noAccount')}</span>
          <a
            onClick={() => {
              onClose();
              navigate('/register');
            }}
          >
            {t('auth.register')}
          </a>
        </div>
      </Form>
    </Modal>
  );
}