// client/src/dashboard/UserAdmin/UserAdmin.tsx

import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, Popconfirm, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useLocale } from '../../store/LocaleContext';
import { useAuth } from '../../store/AuthContext';

// 从环境变量读取后台地址
const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface UserRecord {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled' | 'pending';
  created_at: string;
}

const UserAdmin: React.FC = () => {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form] = Form.useForm();

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.code === 'USERS_LIST_RETRIEVED') {
        setUsers(data.data);
      } else {
        message.error(data.message || t('Dashboard.UserAdmin.fetchFailed'));
      }
    } catch (e) {
      message.error(t('Dashboard.UserAdmin.networkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    try {
      const values = await form.validateFields();
      if (!editingUser) return;

      // 只提交 role 和 status，不提交 email/nickname
      const payload = {
        role: values.role,
        status: values.status,
      };

      const res = await fetch(`${API_BASE}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.code === 'USER_UPDATED') {
        message.success(data.message);
        setEditModalOpen(false);
        fetchUsers();
      } else {
        message.error(data.message || t('Dashboard.UserAdmin.updateFailed'));
      }
    } catch (e) {
      // 表单校验失败，无需处理
    }
  };

  // 更新状态（快捷操作）
  const handleStatusChange = async (user: UserRecord, status: string) => {
    const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();

    if (data.code === 'USER_STATUS_UPDATED') {
      message.success(data.message);
      fetchUsers();
    } else {
      message.error(data.message || t('Dashboard.UserAdmin.statusUpdateFailed'));
    }
  };

  // 删除用户
  const handleDelete = async (user: UserRecord) => {
    const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await res.json();

    if (data.code === 'USER_DELETED') {
      message.success(data.message);
      fetchUsers();
    } else {
      message.error(data.message || t('Dashboard.UserAdmin.deleteFailed'));
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
        <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
          {t('Dashboard.UserAdmin.refresh')}
        </Button>
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
        destroyOnClose
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