// worker/src/utils/email.js

// 前端验证页面的地址（根据环境切换）
const VERIFY_URL = 'http://localhost:5173'; // 本地开发
// 生产环境改成：'https://openedu.com'

export async function sendVerificationEmail({ env, email, token, lang = 'zh' }) {
  // 检查配置
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return { success: false, error: 'RESEND_API_KEY is not set' };
  }
  if (!env.RESEND_FROM_EMAIL) {
    console.error('RESEND_FROM_EMAIL is not set');
    return { success: false, error: 'RESEND_FROM_EMAIL is not set' };
  }

  const verifyLink = `${VERIFY_URL}/verify-email?token=${token}`;

  const subject = lang === 'zh' ? 'OpenEDU 邮箱验证' : 'OpenEDU Email Verification';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #ff4d4f; text-align: center;">OpenEDU</h2>
      <p>${lang === 'zh' ? '请点击以下链接完成邮箱验证：' : 'Please click the link below to verify your email:'}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyLink}" 
           style="background: #ff4d4f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          ${lang === 'zh' ? '验证邮箱' : 'Verify Email'}
        </a>
      </div>
      <p style="color: #999; font-size: 12px;">
        ${lang === 'zh' ? '链接24小时内有效。如果这不是您的操作，请忽略此邮件。' : 'Link valid for 24 hours. If this was not you, please ignore this email.'}
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [email],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return { success: false, error: data };
    }

    console.log('Email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}