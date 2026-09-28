// server/src/utils/logger.js
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import 'winston-daily-rotate-file';

const logDir = 'logs';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const blockedFields = new Set([
  'email',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'code',
  'command',
  'response',
  'responseCode',
  'responseCodeText',
  'stack',
  'cause',
  'failed',
  'passed',
  'total',
  'ip',
  'error',
]);

function redactEmailInString(str) {
  if (typeof str !== 'string') return str;
  return str.replace(
    /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
    '[REDACTED_EMAIL]'
  );
}

function sanitize(info) {
  if (!info || typeof info !== 'object') return info;

  for (const field of blockedFields) {
    delete info[field];
  }

  if (typeof info.message === 'string') {
    info.message = redactEmailInString(info.message);
  }

  return info;
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: false }),
    winston.format(sanitize)(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
    }),
    // 始终输出到控制台，无论什么环境
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

export { logger };