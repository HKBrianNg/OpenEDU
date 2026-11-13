// client/src/store/hooks/useAuth.ts
import { useCallback, useRef, useState } from 'react';
import { api } from '../../utils/request';

interface LoginResponse {
  code: string;
  message?: string;
  data?: { token: string; user: AuthUser };
}

interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'admin' | string;
  status: 'active' | 'pending' | 'disabled' | string;
  [k: string]: unknown;
}

interface CheckResponse {
  code: string;
  message?: string;
  data?: { available?: boolean; status?: string };
}

interface RegisterResponse {
  code: string;
  message?: string;
  data?: { user: AuthUser };
}

// 登录（mutation）：返回 { ok, code, message, token, user }
// 组件拿到 token/user 后调 useAuth().login(token, user) 写全局状态
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (values: { email: string; password: string }): Promise<{
      ok: boolean;
      code?: string;
      message?: string;
      token?: string;
      user?: AuthUser;
    }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post<LoginResponse>('/api/auth/login', values);
        if (res.ok) {
          return {
            ok: true,
            code: res.data.code,
            message: res.data.message,
            token: res.data.data?.token,
            user: res.data.data?.user,
          };
        }
        setError(res.data?.message || 'loginFailed');
        return { ok: false, code: res.data?.code, message: res.data?.message };
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

  return { login, loading, error };
}

// 邮箱预检：内置缓存（同一邮箱只查一次），网络错误放行
export function useEmailCheck() {
  const [checking, setChecking] = useState(false);
  const cacheRef = useRef(new Map<string, boolean>());

  const check = useCallback(async (email: string): Promise<boolean> => {
    if (cacheRef.current.has(email)) {
      return cacheRef.current.get(email)!;
    }
    setChecking(true);
    try {
      const res = await api.get<CheckResponse>(`/api/check-email?email=${encodeURIComponent(email)}`);
      const available = res.data?.data?.available !== false;
      cacheRef.current.set(email, available);
      return available;
    } catch {
      return true; // 网络错误放行，让注册接口去判断
    } finally {
      setChecking(false);
    }
  }, []);

  return { check, checking };
}

// 昵称预检：同上
export function useNicknameCheck() {
  const [checking, setChecking] = useState(false);
  const cacheRef = useRef(new Map<string, boolean>());

  const check = useCallback(async (nickname: string): Promise<boolean> => {
    if (cacheRef.current.has(nickname)) {
      return cacheRef.current.get(nickname)!;
    }
    setChecking(true);
    try {
      const res = await api.get<CheckResponse>(`/api/check-nickname?nickname=${encodeURIComponent(nickname)}`);
      const available = res.data?.data?.available !== false;
      cacheRef.current.set(nickname, available);
      return available;
    } catch {
      return true;
    } finally {
      setChecking(false);
    }
  }, []);

  return { check, checking };
}

// 注册（mutation）：返回 { ok, message, user }
export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(
    async (values: { email: string; password: string; nickname: string }): Promise<{
      ok: boolean;
      message?: string;
      user?: AuthUser;
    }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post<RegisterResponse>('/api/register', values);
        if (res.ok) {
          return { ok: true, message: res.data?.message, user: res.data?.data?.user };
        }
        setError(res.data?.message || 'registerFailed');
        return { ok: false, message: res.data?.message };
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

  return { register, loading, error };
}

// 修改自己的昵称（mutation）：成功后由组件调 useAuth().updateUser({ nickname }) 同步全局
export function useUpdateNickname() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateNickname = useCallback(
    async (nickname: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.patch<{ code: string; message?: string }>('/api/profile', { nickname });
        if (res.ok) {
          return { ok: true, message: res.data?.message };
        }
        setError(res.data?.message || 'updateFailed');
        return { ok: false, message: res.data?.message };
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

  return { updateNickname, loading, error };
}

// 修改自己的密码（mutation）：需验原密码
export function useChangePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePassword = useCallback(
    async (values: { oldPassword: string; newPassword: string }): Promise<{
      ok: boolean;
      code?: string;
      message?: string;
    }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.put<{ code: string; message?: string }>('/api/profile/password', values);
        if (res.ok) {
          return { ok: true, code: res.data?.code, message: res.data?.message };
        }
        setError(res.data?.message || 'updateFailed');
        return { ok: false, code: res.data?.code, message: res.data?.message };
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

  return { changePassword, loading, error };
}

// 邮箱验证：返回 { verify, verifying }
// verify(token) → { code, message }
//   VERIFY_SUCCESS / ALREADY_VERIFIED → 成功
//   VERIFY_EXPIRED → 链接过期
//   其它 code / NETWORK_ERROR → 失败
export function useVerifyEmail() {
  const [verifying, setVerifying] = useState(false);

  const verify = useCallback(async (token: string): Promise<{
    code: string;
    message?: string;
  }> => {
    setVerifying(true);
    try {
      const res = await api.get<{ code: string; message?: string }>(
        `/api/verify-email?token=${encodeURIComponent(token)}`,
      );
      return { code: res.data?.code || 'UNKNOWN', message: res.data?.message };
    } catch (e) {
      return { code: 'NETWORK_ERROR', message: (e as Error)?.message || 'networkError' };
    } finally {
      setVerifying(false);
    }
  }, []);

  return { verify, verifying };
}
