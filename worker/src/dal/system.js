// src/dal/system.js
import { db } from '../utils/db.js';

// 验证数据库连接
async function ping(env) {
  return db.rpc(env, 'ping');
}

export { ping };