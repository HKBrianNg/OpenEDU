// client/src/utils/request.ts（或你现有的请求封装）

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const api = {
  get: async (path: string, token?: string) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    return res.json();
  },
  
  post: async (path: string, body: any, token?: string) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  
  patch: async (path: string, body: any, token?: string) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};