// server/src/utils/email.js
import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SITE_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    logger.info(`Email sent to ${to}`, { messageId: info.messageId });
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

// 发送验证码邮件
async function sendVerificationCode(email, code) {
  const subject = `【${process.env.SITE_NAME}】邮箱验证码`;
  const html = `
    <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif;">
      <h2 style="color: #333;">邮箱验证</h2>
      <p style="color: #666; font-size: 14px;">您好，感谢您注册 ${process.env.SITE_NAME}。</p>
      <p style="color: #666; font-size: 14px;">您的验证码为：</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1976d2;">${code}</span>
      </div>
      <p style="color: #999; font-size: 12px;">验证码有效期为10分钟，请尽快完成验证。</p>
      <p style="color: #999; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

// 发送审核通过通知
async function sendAccountApproved(email) {
  const subject = `【${process.env.SITE_NAME}】账号已通过审核`;
  const html = `
    <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif;">
      <h2 style="color: #333;">审核通过通知</h2>
      <p style="color: #666; font-size: 14px;">您好，您的账号已通过管理员审核。</p>
      <p style="color: #666; font-size: 14px;">您现在可以登录 ${process.env.SITE_NAME} 开始使用了。</p>
      <a href="${process.env.FRONTEND_URL}/login" 
         style="display: inline-block; background: #1976d2; color: white; padding: 12px 24px; 
                border-radius: 6px; text-decoration: none; margin-top: 20px;">
        前往登录
      </a>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

// 发送审核驳回通知
async function sendAccountRejected(email, reason) {
  const subject = `【${process.env.SITE_NAME}】注册申请未通过审核`;
  const html = `
    <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif;">
      <h2 style="color: #333;">审核未通过通知</h2>
      <p style="color: #666; font-size: 14px;">您好，很抱歉，您的注册申请未通过管理员审核。</p>
      <p style="color: #666; font-size: 14px;">原因：${reason}</p>
      <p style="color: #999; font-size: 12px;">如有疑问，请联系管理员。</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
}

export { sendVerificationCode, sendAccountApproved, sendAccountRejected };