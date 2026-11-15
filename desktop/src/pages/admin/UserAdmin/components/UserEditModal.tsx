// desktop/src/pages/admin/UserAdmin/components/UserEditModal.tsx
import { Modal, Form, Select } from 'antd';
import { useLocale } from '../../../../store/LocaleContext';

interface Props {
  open: boolean;
  user: {
    id: string;
    email: string;
    nickname: string;
    role: string;
    status: string;
  } | null;
  onSubmit: (payload: { role: string; status: string }) => void;
  onClose: () => void;
}

export default function UserEditModal({ open, user, onSubmit, onClose }: Props) {
  const { t } = useLocale();
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // validation failed
    }
  };

  // Modal 关闭时重置表单，防止下次打开闪旧值
  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      key={user?.id}
      title={t('admin.userAdmin.editTitle')}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={t('admin.userAdmin.save')}
      cancelText={t('admin.userAdmin.cancel')}
      destroyOnHidden
    >
      {user && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: user.role,
            status: user.status,
          }}
        >
          <Form.Item label={t('admin.userAdmin.fieldEmail')}>
            <span>{user.email}</span>
          </Form.Item>
          <Form.Item label={t('admin.userAdmin.fieldNickname')}>
            <span>{user.nickname}</span>
          </Form.Item>
          <Form.Item
            name="role"
            label={t('admin.userAdmin.colRole')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'admin', label: t('admin.userAdmin.role.admin') },
                { value: 'user', label: t('admin.userAdmin.role.user') },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label={t('admin.userAdmin.colStatus')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'active', label: t('admin.userAdmin.status.active') },
                { value: 'disabled', label: t('admin.userAdmin.status.disabled') },
                { value: 'pending', label: t('admin.userAdmin.status.pending') },
              ]}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}