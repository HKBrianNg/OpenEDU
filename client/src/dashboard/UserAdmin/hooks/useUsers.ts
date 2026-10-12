// client/src/dashboard/UserAdmin/hooks/useUsers.ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../utils/request';
import type { UserRecord } from '../types';

interface UserResponse {
  code: string;
  message?: string;
  data?: UserRecord[];
}

interface ActionResponse {
  code: string;
  message?: string;
}

// 查询用户列表：首次挂载自动加载，refresh() 供 mutation 后重新拉取
export function useUserList() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<UserResponse>('/api/users');
      if (res.ok && res.data.code === 'USERS_LIST_RETRIEVED' && res.data.data) {
        setUsers(res.data.data);
      } else {
        setError(res.data?.message || 'fetchFailed');
      }
    } catch (e) {
      setError((e as Error)?.message || 'networkError');
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
  const [error, setError] = useState<string | null>(null);

  const updateUser = useCallback(
    async (
      id: string,
      payload: { role: string; status: string },
    ): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.put<ActionResponse>(`/api/users/${id}`, payload);
        const ok = res.ok && res.data.code === 'USER_UPDATED';
        if (!ok) setError(res.data?.message || 'updateFailed');
        return { ok, message: res.data?.message };
      } catch (e) {
        const msg = (e as Error)?.message || 'networkError';
        setError(msg);
        return { ok: false, message: msg };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateStatus = useCallback(
    async (id: string, status: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.patch<ActionResponse>(`/api/users/${id}`, { status });
        const ok = res.ok && res.data.code === 'USER_STATUS_UPDATED';
        if (!ok) setError(res.data?.message || 'statusUpdateFailed');
        return { ok, message: res.data?.message };
      } catch (e) {
        const msg = (e as Error)?.message || 'networkError';
        setError(msg);
        return { ok: false, message: msg };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const remove = useCallback(
    async (id: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.delete<ActionResponse>(`/api/users/${id}`);
        const ok = res.ok && res.data.code === 'USER_DELETED';
        if (!ok) setError(res.data?.message || 'deleteFailed');
        return { ok, message: res.data?.message };
      } catch (e) {
        const msg = (e as Error)?.message || 'networkError';
        setError(msg);
        return { ok: false, message: msg };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, updateUser, updateStatus, remove };
}
