import { useState } from 'react';
import { Form, Input, Button, Modal, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { createTranslator } from '../utils/locale';
import loginResource from '../locales/login.json';

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
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      // Supabase 登录预留位置
      console.log('login payload:', values);
      message.success(t('login.success'));
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err) {
      message.error(t('login.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={440}
      destroyOnClose
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
