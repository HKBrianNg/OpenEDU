import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ─── QQ 邮箱 SMTP transporter ───────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.QQ_MAIL!,
    pass: process.env.QQ_AUTH_CODE!,
  },
});

// 启动时校验 SMTP 配置
transporter.verify((error) => {
  if (error) {
    console.error('❌ QQ 邮箱 SMTP 配置错误:', error.message);
    console.error('   检查 QQ_MAIL 和 QQ_AUTH_CODE 是否正确');
  } else {
    console.log('✅ QQ 邮箱 SMTP 就绪');
  }
});

// ─── 频率限制（内存级） ─────────────────────────────────
const rateLimit = new Map<string, number>();
const RATE_WINDOW = 60_000; // 1 分钟

// ─── 发验证邮件 ─────────────────────────────────────────
app.post('/send-verify', async (req, res) => {
  // 1. 内部鉴权
  const authHeader = req.headers['x-internal-key'];
  if (authHeader !== process.env.MAIL_SVC_KEY) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  const { to, token } = req.body;
  if (!to || !token) {
    return res.status(400).json({ ok: false, message: 'Missing to or token' });
  }

  // 2. 频率限制
  const lastSent = rateLimit.get(to);
  if (lastSent && Date.now() - lastSent < RATE_WINDOW) {
    return res.status(429).json({ ok: false, message: 'Too many requests, please wait 1 minute' });
  }

  // 3. 发信
  try {
    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
      from: `"No Reply" <${process.env.QQ_MAIL}>`,
      to,
      subject: '请验证你的邮箱',
      text: `点击以下链接验证你的邮箱：\n\n${verifyUrl}\n\n链接 24 小时内有效。如果这不是你的操作，请忽略此邮件。`,
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;padding:24px;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#1677ff;">验证你的邮箱</h2>
          <p>感谢注册，请点击按钮完成邮箱验证：</p>
          <p style="margin:24px 0;">
            <a href="${verifyUrl}"
               style="background:#1677ff;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">
              验证邮箱
            </a>
          </p>
          <p style="color:#666;">或复制链接到浏览器：</p>
          <p style="color:#666;word-break:break-all;font-size:13px;">${verifyUrl}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#999;font-size:12px;">链接 24 小时内有效。如果这不是你的操作，请忽略此邮件。</p>
        </div>
      `,
    });

    rateLimit.set(to, Date.now());
    console.log(`📧 验证邮件已发至 ${to}`);
    res.json({ ok: true, message: 'Email sent' });

  } catch (err: any) {
    console.error('❌ 发信失败:', err.message);
    res.status(500).json({ ok: false, message: 'Send failed', error: err.message });
  }
});

// ─── 测试发信（开发用） ─────────────────────────────────
app.post('/send-test', async (req, res) => {
  const authHeader = req.headers['x-internal-key'];
  if (authHeader !== process.env.MAIL_SVC_KEY) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }

  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ ok: false, message: 'Missing to' });
  }

  try {
    await transporter.sendMail({
      from: `"Test" <${process.env.QQ_MAIL}>`,
      to,
      subject: '邮件服务测试',
      text: '如果你收到这封邮件，说明 QQ 邮箱 SMTP 配置成功！',
      html: '<p>如果你收到这封邮件，说明 <strong>QQ 邮箱 SMTP 配置成功！</strong></p>',
    });

    console.log(`📧 测试邮件已发至 ${to}`);
    res.json({ ok: true, message: 'Test email sent' });
  } catch (err: any) {
    console.error('❌ 测试发信失败:', err.message);
    res.status(500).json({ ok: false, message: 'Send failed', error: err.message });
  }
});

// ─── 健康检查 ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mail-svc', time: new Date().toISOString() });
});

// ─── 启动 ───────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
  console.log(`🚀 Mail service running on http://localhost:${PORT}`);
  console.log(`   发验证邮件: POST http://localhost:${PORT}/send-verify`);
  console.log(`   测试发信:   POST http://localhost:${PORT}/send-test`);
  console.log(`   健康检查:   GET  http://localhost:${PORT}/health`);
});