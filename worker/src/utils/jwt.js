// src/utils/jwt.js
import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

export async function signToken(payload, secret, expiresIn = '7d') {
  const key = encoder.encode(secret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60; // 7 days

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
}

export async function verifyToken(token, secret) {
  const key = encoder.encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload;
}