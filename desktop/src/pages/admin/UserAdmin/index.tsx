// desktop/src/pages/admin/UserAdmin/index.tsx
import { useState } from 'react';
import { Card, Table, Tag, Button, Space, Popconfirm, App, Alert } from 'antd';
import { ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUsers } from './hooks/useUsers';
import UserEditModal from './components/UserEditModal';
import { useLocale } from '../../../store/LocaleContext';
import type { User } from './hooks/useUsers';

export function UserAdmin() {
  const { t } = useLocale();
  const { message } = App.useApp();
  const {
    users,
    loading,
    error,
    refresh,
    updateUser,
    updateStatus,
    removeUser,
  } = useUsers();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (payload: { role: string; status: string }) => {
    if (!editingUser) return;
    const result = await updateUser(editingUser.id, payload);
    if (result.ok) {
      message.success(result.message);
      setEditModalOpen(false);
      setEditingUser(null);
      refresh();
    } else {
      message.error(result.message);
    }
  };

  const handleStatusToggle = async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const result = await updateStatus(user.id, newStatus);
    if (result.ok) {
      message.success(result.message);
      refresh();
    } else {
      message.error(result.message);
    }
  };

  const handleDelete = async (user: User) => {
    const result = await removeUser(user.id);
    if (result.ok) {
      message.success(result.message);
      refresh();
    } else {
      message.error(result.message);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'volcano';
      case 'user': return 'blue';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'disabled': return 'red';
      case 'pending': return 'orange';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: t('admin.userAdmin.colEmail'),
      dataIndex: 'email' as const,
      key: 'email',
      ellipsis: true,
      width: 200,
    },
    {
      title: t('admin.userAdmin.colNickname'),
      dataIndex: 'nickname' as const,
      key: 'nickname',
      width: 120,
    },
    {
      title: t('admin.userAdmin.colRole'),
      dataIndex: 'role' as const,
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {t(`admin.userAdmin.role.${role}`)}
        </Tag>
      ),
    },
    {
      title: t('admin.userAdmin.colStatus'),
      dataIndex: 'status' as const,
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {t(`admin.userAdmin.status.${status}`)}
        </Tag>
      ),
    },
    {
      title: t('admin.userAdmin.colCreated'),
      dataIndex: 'created_at' as const,
      key: 'created_at',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: t('admin.userAdmin.colActions'),
      key: 'actions',
      width: 180,
      render: (_: unknown, record: User) => (
        <Space orientation="horizontal">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('admin.userAdmin.edit')}
          </Button>
          <Button
            size="small"
            onClick={() => handleStatusToggle(record)}
          >
            {record.status === 'active'
              ? t('admin.userAdmin.disable')
              : t('admin.userAdmin.enable')}
          </Button>
          <Popconfirm
            title={t('admin.userAdmin.deleteConfirm')}
            description={t('admin.userAdmin.deleteConfirmDesc')}
            onConfirm={() => handleDelete(record)}
            okText={t('admin.userAdmin.confirm')}
            cancelText={t('admin.userAdmin.cancel')}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              {t('admin.userAdmin.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={t('admin.userAdmin.title')}
        style={{ marginBottom: 24 }}
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
            {t('admin.userAdmin.refresh')}
          </Button>
        }
      >
        {error && (
          <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />
        )}
        <Table<User>
          dataSource={users}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20 }}
          loading={loading}
          locale={{ emptyText: t('admin.userAdmin.emptyText') || '暂无用户数据' }}
        />
      </Card>

      <UserEditModal
        open={editModalOpen}
        user={editingUser}
        onSubmit={handleEditSubmit}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUser(null);
        }}
      />
    </>
  );
}