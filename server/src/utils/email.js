// server/src/utils/email.js
import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// 从环境变量读取邮件配置
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const mailFrom = process.env.MAIL_FROM || 'OpenEDU <noreply@openedu.com>';

// 创建 transporter（延迟初始化，允许测试时 mock）
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(smtpConfig);
  }
  return transporter;
}

// 测试环境下重置 transporter（用于 mock）
function resetTransporter() {
  transporter = null;
}

/**
 * 发送验证码邮件
 * @param {string} email - 收件人邮箱
 * @param {string} code - 6位验证码
 */
async function sendVerificationCode(email, code) {
  try {
    const info = await getTransporter().sendMail({
      from: mailFrom,
      to: email,
      subject: 'OpenEDU 邮箱验证',
      html: `
        <div style="max-width: 480px; margin: 0 auto; padding: 24px; font-family: sans-serif;">
          <h2 style="color: #333;">OpenEDU 邮箱验证</h2>
          <p>您好，感谢您注册 OpenEDU！</p>
          <p>您的验证码为：</p>
          <div style="font-size: 32px; letter-spacing: 8px; text-align: center; padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
            <strong>${code}</strong>
          </div>
          <p style="color: #999; font-size: 12px;">验证码有效期 10 分钟，请勿泄露给他人。</p>
          <p style="color: #999; font-size: 12px;">如果您没有注册 OpenEDU，请忽略此邮件。</p>
        </div>
      `,
    });

    logger.info('Verification email sent', {
      messageId: info.messageId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send verification email', {
      error: error.message,
    });
    return false;
  }
}

/**
 * 发送密码重置邮件
 * @param {string} email - 收件人邮箱
 * @param {string} resetLink - 重置链接
 */
async function sendPasswordReset(email, resetLink) {
  try {
    const info = await getTransporter().sendMail({
      from: mailFrom,
      to: email,
      subject: 'OpenEDU 密码重置',
      html: `
        <div style="max-width: 480px; margin: 0 auto; padding: 24px; font-family: sans-serif;">
          <h2 style="color: #333;">OpenEDU 密码重置</h2>
          <p>您好，我们收到了您的密码重置请求。</p>
          <p>请点击下方链接重置密码：</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px;">
              重置密码
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">链接有效期 30 分钟，请勿转发。</p>
          <p style="color: #999; font-size: 12px;">如果您没有请求重置密码，请忽略此邮件。</p>
        </div>
      `,
    });

    logger.info('Password reset email sent', {
      messageId: info.messageId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send password reset email', {
      error: error.message,
    });
    return false;
  }
}

export { sendVerificationCode, sendPasswordReset, resetTransporter, getTransporter };