// client/src/dashboard/UserAdmin/UserAdmin.tsx
import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, Popconfirm, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useLocale } from '../../store/LocaleContext';
import { useUserList, useUserActions } from './hooks/useUsers';
import type { UserRecord } from './types';

interface UserAdminProps {
  onExit?: () => void;
}

const UserAdmin: React.FC<UserAdminProps> = ({ onExit }) => {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { users, loading, refresh } = useUserList();
  const { loading: actionLoading, updateUser, updateStatus, remove } = useUserActions();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form] = Form.useForm();

  // 打开编辑弹窗
  const handleEdit = (user: UserRecord) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      status: user.status,
    });
    setEditModalOpen(true);
  };

  // 提交编辑（只提交 role 和 status）
  const handleEditSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      // 表单校验失败，无需处理
      return;
    }
    if (!editingUser) return;

    const result = await updateUser(editingUser.id, {
      role: values.role,
      status: values.status,
    });

    if (result.ok) {
      message.success(result.message);
      setEditModalOpen(false);
      refresh();
    } else {
      message.error(result.message || t('Dashboard.UserAdmin.updateFailed'));
    }
  };

  // 更新状态（快捷操作）
  const handleStatusChange = async (user: UserRecord, status: string) => {
    const result = await updateStatus(user.id, status);
    if (result.ok) {
      message.success(result.message);
      refresh();
    } else {
      message.error(result.message || t('Dashboard.UserAdmin.statusUpdateFailed'));
    }
  };

  // 删除用户
  const handleDelete = async (user: UserRecord) => {
    const result = await remove(user.id);
    if (result.ok) {
      message.success(result.message);
      refresh();
    } else {
      message.error(result.message || t('Dashboard.UserAdmin.deleteFailed'));
    }
  };

  // 状态标签颜色
  const statusColors: Record<string, string> = {
    active: 'green',
    disabled: 'red',
    pending: 'orange',
  };

  // 角色标签颜色
  const roleColors: Record<string, string> = {
    admin: 'volcano',
    user: 'blue',
  };

  const columns = [
    {
      title: t('Dashboard.UserAdmin.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('Dashboard.UserAdmin.nickname'),
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: t('Dashboard.UserAdmin.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={roleColors[role]}>{t(`Dashboard.UserAdmin.role.${role}`)}</Tag>
      ),
    },
    {
      title: t('Dashboard.UserAdmin.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: UserRecord) => (
        <Select
          value={status}
          style={{ width: 110 }}
          onChange={(value) => handleStatusChange(record, value)}
          options={[
            { value: 'active', label: <Tag color={statusColors.active}>{t('Dashboard.UserAdmin.status.active')}</Tag> },
            { value: 'disabled', label: <Tag color={statusColors.disabled}>{t('Dashboard.UserAdmin.status.disabled')}</Tag> },
            { value: 'pending', label: <Tag color={statusColors.pending}>{t('Dashboard.UserAdmin.status.pending')}</Tag> },
          ]}
        />
      ),
    },
    {
      title: t('Dashboard.UserAdmin.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('Dashboard.UserAdmin.actions'),
      key: 'action',
      render: (_: unknown, record: UserRecord) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            {t('Dashboard.UserAdmin.edit')}
          </Button>
          <Popconfirm
            title={t('Dashboard.UserAdmin.deleteConfirmTitle')}
            description={t('Dashboard.UserAdmin.deleteConfirmDescription')}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger>
              {t('Dashboard.UserAdmin.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <h2 style={{ margin: 0 }}>{t('Dashboard.UserAdmin.title')}</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
            {t('Dashboard.UserAdmin.refresh')}
          </Button>
          {/* 返回仪表板统一放在头部最右（固定不随页面滚动），这里不再重复放一个 */}
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={users}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 编辑弹窗 */}
      <Modal
        title={t('Dashboard.UserAdmin.editTitle')}
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={actionLoading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="email" label={t('Dashboard.UserAdmin.email')}>
            <Input disabled />
          </Form.Item>

          <Form.Item name="nickname" label={t('Dashboard.UserAdmin.nickname')}>
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="role"
            label={t('Dashboard.UserAdmin.role')}
            rules={[{ required: true, message: t('Dashboard.UserAdmin.roleRequired') }]}
          >
            <Select
              options={[
                { value: 'user', label: t('Dashboard.UserAdmin.role.user') },
                { value: 'admin', label: t('Dashboard.UserAdmin.role.admin') },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label={t('Dashboard.UserAdmin.status')}
            rules={[{ required: true, message: t('Dashboard.UserAdmin.statusRequired') }]}
          >
            <Select
              options={[
                { value: 'active', label: t('Dashboard.UserAdmin.status.active') },
                { value: 'disabled', label: t('Dashboard.UserAdmin.status.disabled') },
                { value: 'pending', label: t('Dashboard.UserAdmin.status.pending') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserAdmin;
