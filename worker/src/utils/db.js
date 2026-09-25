// src/utils/db.js
// Supabase REST 封裝，不用 pg，不用 client SDK

export async function dbQuery(env, { 
  table, 
  method = 'GET', 
  select = '*', 
  filters = '', 
  body = null,
  order = '',
  limit = null,
}) {
  // 構建 URL
  let path = `/rest/v1/${table}?select=${select}`;
  
  // 過濾條件（例：`id=eq.123`）
  if (filters) path += `&${filters}`;
  
  // 排序（例：`created_at.desc`）
  if (order) path += `&order=${order}`;
  
  // 限制筆數
  if (limit) path += `&limit=${limit}`;

  const url = `${env.SUPABASE_URL}${path}`;
  
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',  // 讓 INSERT/UPDATE 返回數據
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase ${method} ${table} failed: ${res.status} ${errorText}`);
  }

  // DELETE 返回 204
  if (res.status === 204) return null;
  
  return res.json();
}

// 常用操作的簡化封裝
export const db = {
  // 查詢多筆
  async select(env, table, { select = '*', filters = '', order = '', limit = null } = {}) {
    return dbQuery(env, { table, select, filters, order, limit });
  },

  // 查詢單筆
  async selectOne(env, table, { select = '*', filters = '' } = {}) {
    const data = await dbQuery(env, { table, select, filters, limit: 1 });
    return data[0] || null;
  },

  // 新增
  async insert(env, table, body) {
    return dbQuery(env, { table, method: 'POST', body });
  },

  // 更新
  async update(env, table, filters, body) {
    return dbQuery(env, { table, method: 'PATCH', filters, body });
  },

  // 刪除
  async delete(env, table, filters) {
    return dbQuery(env, { table, method: 'DELETE', filters });
  },
};