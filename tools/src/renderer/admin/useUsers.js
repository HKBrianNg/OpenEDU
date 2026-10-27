// tools/src/renderer/admin/useUsers.js
// 从 client/src/dashboard/UserAdmin/hooks/useUsers.ts 搬过来：只去掉类型标注。

import { useCallback, useEffect, useState } from 'react';
import { api } from './apiClient';
import { t } from '../i18n';

// 查询用户列表：首次挂载自动加载，refresh() 供 mutation 后重新拉取
export function useUserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/users');
      if (res.ok && res.data.code === 'USERS_LIST_RETRIEVED' && res.data.data) {
        setUsers(res.data.data);
      } else {
        setError(res.data?.message || t('Dashboard.UserAdmin.fetchFailed'));
      }
    } catch (e) {
      setError(e?.message || t('Dashboard.UserAdmin.networkError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { users, loading, error, refresh };
}

// 用户写操作：update / patch status / delete
// 各方法返回 { ok, message }，由组件决定如何提示用户
export function useUserActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateUser = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put(`/api/users/${id}`, payload);
      const ok = res.ok && res.data.code === 'USER_UPDATED';
      if (!ok) setError(res.data?.message || t('Dashboard.UserAdmin.updateFailed'));
      return { ok, message: res.data?.message };
    } catch (e) {
      const msg = e?.message || t('Dashboard.UserAdmin.networkError');
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id, status) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.patch(`/api/users/${id}`, { status });
      const ok = res.ok && res.data.code === 'USER_STATUS_UPDATED';
      if (!ok) setError(res.data?.message || t('Dashboard.UserAdmin.statusUpdateFailed'));
      return { ok, message: res.data?.message };
    } catch (e) {
      const msg = e?.message || t('Dashboard.UserAdmin.networkError');
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.delete(`/api/users/${id}`);
      const ok = res.ok && res.data.code === 'USER_DELETED';
      if (!ok) setError(res.data?.message || t('Dashboard.UserAdmin.deleteFailed'));
      return { ok, message: res.data?.message };
    } catch (e) {
      const msg = e?.message || t('Dashboard.UserAdmin.networkError');
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, updateUser, updateStatus, remove };
}
