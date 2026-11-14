import { Form, Input, Button, Modal, Typography, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { createTranslator } from '../../../utils/locale';
import loginResource from '../../../locales/login.json';
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

export default function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const t = createTranslator(loginResource);
  const { message: msg } = App.useApp();
  const { login: setAuth } = useAuth();
  const { login, loading } = useLogin();
  const [form] = Form.useForm<LoginFormValues>();

  const onFinish = async (values: LoginFormValues) => {
    const result = await login(values);

    if (result.ok && result.token && result.user) {
      setAuth(result.token, result.user);
      msg.success(t('login.success'));
      form.resetFields();
      onClose();
      onSuccess?.();
    } else {
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        msg.warning(t('login.emailNotVerified') || 'Please verify your email first');
      } else if (result.code === 'ACCOUNT_DISABLED') {
        msg.error(t('login.accountDisabled') || 'Account disabled');
      } else {
        msg.error(result.message || t('login.fail'));
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
        {t('login.title')}
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
          label={t('login.email')}
          rules={[
            { required: true, message: t('login.emailRequired') },
            { type: 'email', message: t('login.emailInvalid') }
          ]}
        >
          <Input prefix={<UserOutlined />} size="large" placeholder="you@example.com" />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('login.password')}
          rules={[{ required: true, message: t('login.passwordRequired') }]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" placeholder="••••••••" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            {t('login.submit')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}