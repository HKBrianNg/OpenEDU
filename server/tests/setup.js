import 'dotenv/config';
import { vi } from 'vitest';

vi.mock('../src/utils/email.js', () => ({
  sendVerificationCode: vi.fn().mockResolvedValue(true),
  sendPasswordReset: vi.fn().mockResolvedValue(true),
  resetTransporter: vi.fn(),
  getTransporter: vi.fn(),
}));