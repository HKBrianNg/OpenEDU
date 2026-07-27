// server/src/utils/verification.js
import { v4 as uuidv4 } from 'uuid';

// 内存存储验证码（生产环境建议用 Redis）
const store = new Map();

// 生成6位数字验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 存储验证码
function setCode(email, code, expiresInMinutes = 10) {
  const id = uuidv4();
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

  store.set(email, { id, code, expiresAt, attempts: 0 });

  // 自动清理过期验证码
  setTimeout(() => {
    if (store.has(email) && store.get(email).id === id) {
      store.delete(email);
    }
  }, expiresInMinutes * 60 * 1000);

  return id;
}

// 验证验证码
function verifyCode(email, code) {
  const record = store.get(email);

  if (!record) {
    return { valid: false, reason: 'CODE_NOT_FOUND' };
  }

  // 检查是否超过最大尝试次数
  if (record.attempts >= 5) {
    store.delete(email);
    return { valid: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  // 增加尝试次数
  record.attempts += 1;

  // 检查是否过期
  if (Date.now() > record.expiresAt) {
    store.delete(email);
    return { valid: false, reason: 'CODE_EXPIRED' };
  }

  // 检查验证码是否正确
  if (record.code !== code) {
    return { valid: false, reason: 'CODE_INCORRECT' };
  }

  // 验证成功，清除验证码
  store.delete(email);
  return { valid: true };
}

// 清除验证码
function clearCode(email) {
  store.delete(email);
}

export { generateCode, setCode, verifyCode, clearCode };