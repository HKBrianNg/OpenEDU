// src/utils/db.js

/**
 * Supabase REST API 封裝（新格式）
 * 用法：
 *   db.select(env, 'users', { filters: 'email=eq.test@example.com' })
 *   db.insert(env, 'users', { email: '...', password_hash: '...' })
 *   db.rpc(env, 'ping')
 */

async function request(env, { 
  table, 
  method = 'GET', 
  select = '*', 
  filters = '', 
  body = null,
  order = '',
  limit = null,
}) {
  let path = `/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  if (filters) path += `&${filters}`;
  if (order) path += `&order=${encodeURIComponent(order)}`;
  if (limit != null) path += `&limit=${limit}`;

  const url = `${env.SUPABASE_URL}${path}`;
  
  const headers = {
    apikey: env.SUPABASE_SECRET_KEY,   // 新格式：只用 apikey，不用 Authorization Bearer
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase ${method} ${table} failed: ${res.status} ${errorText}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// RPC 调用（用于执行 SQL 函数）
async function rpc(env, fnName, params = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  
  const headers = {
    apikey: env.SUPABASE_SECRET_KEY,
    'Content-Type': 'application/json',
  };

  const options = {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  };

  const res = await fetch(url, options);
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase RPC ${fnName} failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

export const db = {
  async select(env, table, { select = '*', filters = '', order = '', limit = null } = {}) {
    return request(env, { table, select, filters, order, limit });
  },

  async selectOne(env, table, { select = '*', filters = '' } = {}) {
    const data = await request(env, { table, select, filters, limit: 1 });
    return data[0] || null;
  },

  async insert(env, table, body) {
    return request(env, { table, method: 'POST', body });
  },

  async update(env, table, filters, body) {
    return request(env, { table, method: 'PATCH', filters, body });
  },

  async delete(env, table, filters) {
    return request(env, { table, method: 'DELETE', filters });
  },

  rpc,
};