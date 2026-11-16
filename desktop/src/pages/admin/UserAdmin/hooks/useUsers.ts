// desktop/src/pages/admin/UserAdmin/hooks/useUsers.ts
import { useCallback, useState } from 'react';
import { api } from '../../../../utils/request';
import { useLocale } from '../../../../store/LocaleContext';

export interface User {
  id: string;
  email: string;
  nickname: string;
  role: 'admin' | 'user' | string;
  status: 'active' | 'disabled' | 'pending' | string;
  created_at: string;
}

export interface UpdateUserPayload {
  role?: string;
  status?: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export function useUsers() {
  const { t } = useLocale();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/api/users');
      if (res.ok) {
        const raw = res.data;
        let list: User[] = [];

        // 1. 当前后端真实返回: { code, message, data: [...] }
        if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
          list = raw.data;
        }
        // 2. 兼容 { users: [...] }
        else if (raw && typeof raw === 'object' && Array.isArray(raw.users)) {
          list = raw.users;
        }
        // 3. 兼容纯数组 [...]
        else if (Array.isArray(raw)) {
          list = raw;
        }

        setUsers(list);
        if (list.length === 0) {
          // 接口成功但返回空数组，不报错（可能是真的没数据）
          // 如果结构完全不对，给个提示
          if (!raw || (typeof raw === 'object' && !Array.isArray(raw.data) && !Array.isArray(raw.users))) {
            setError(t('admin.userAdmin.fetchFailed'));
          }
        }
      } else {
        const errMsg = (res.data as { message?: string })?.message
          || t('admin.userAdmin.fetchFailed');
        setError(errMsg);
        setUsers([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.userAdmin.networkError'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const updateUser = useCallback(async (id: string, payload: UpdateUserPayload): Promise<ActionResult> => {
    try {
      const res = await api.put<{ message?: string }>(`/api/users/${id}`, payload);
      if (res.ok) {
        return { ok: true, message: t('admin.userAdmin.updateSuccess') };
      }
      return { ok: false, message: (res.data as { message?: string })?.message || t('admin.userAdmin.updateFailed') };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : t('admin.userAdmin.updateFailed') };
    }
  }, [t]);

  const updateStatus = useCallback(async (id: string, status: string): Promise<ActionResult> => {
    try {
      const res = await api.patch<{ message?: string }>(`/api/users/${id}`, { status });
      if (res.ok) {
        return { ok: true, message: t('admin.userAdmin.statusUpdateSuccess') };
      }
      return { ok: false, message: (res.data as { message?: string })?.message || t('admin.userAdmin.statusUpdateFailed') };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : t('admin.userAdmin.statusUpdateFailed') };
    }
  }, [t]);

  const removeUser = useCallback(async (id: string): Promise<ActionResult> => {
    try {
      const res = await api.delete<{ message?: string }>(`/api/users/${id}`);
      if (res.ok) {
        return { ok: true, message: t('admin.userAdmin.deleteSuccess') };
      }
      return { ok: false, message: (res.data as { message?: string })?.message || t('admin.userAdmin.deleteFailed') };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : t('admin.userAdmin.deleteFailed') };
    }
  }, [t]);

  return {
    users,
    loading,
    error,
    refresh,
    updateUser,
    updateStatus,
    removeUser,
  };
}