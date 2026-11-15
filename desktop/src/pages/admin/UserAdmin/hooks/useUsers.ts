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
      const res = await api.get<{ users: User[] }>('/api/admin/users');
      if (res.ok && res.data?.users) {
        setUsers(res.data.users);
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
      const res = await api.put<{ message?: string }>(`/api/admin/users/${id}`, payload);
      if (res.ok) {
        return {
          ok: true,
          message: t('admin.userAdmin.updateSuccess'),
        };
      }
      return {
        ok: false,
        message: (res.data as { message?: string })?.message || t('admin.userAdmin.updateFailed'),
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : t('admin.userAdmin.updateFailed'),
      };
    }
  }, [t]);

  const updateStatus = useCallback(async (id: string, status: string): Promise<ActionResult> => {
    try {
      const res = await api.put<{ message?: string }>(`/api/admin/users/${id}/status`, { status });
      if (res.ok) {
        return {
          ok: true,
          message: t('admin.userAdmin.statusUpdateSuccess'),
        };
      }
      return {
        ok: false,
        message: (res.data as { message?: string })?.message || t('admin.userAdmin.statusUpdateFailed'),
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : t('admin.userAdmin.statusUpdateFailed'),
      };
    }
  }, [t]);

  const removeUser = useCallback(async (id: string): Promise<ActionResult> => {
    try {
      const res = await api.delete<{ message?: string }>(`/api/admin/users/${id}`);
      if (res.ok) {
        return {
          ok: true,
          message: t('admin.userAdmin.deleteSuccess'),
        };
      }
      return {
        ok: false,
        message: (res.data as { message?: string })?.message || t('admin.userAdmin.deleteFailed'),
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : t('admin.userAdmin.deleteFailed'),
      };
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