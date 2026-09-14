import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

// Without SMTP configured (local/dev), the reset link is logged instead of emailed —
// keeps password reset usable in every environment without requiring mail credentials.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — password reset link for ${to}: ${resetUrl}`);
    return;
  }
  await transporter.sendMail({
    from: SMTP_FROM || 'SocialNet <no-reply@a2t.io.vn>',
    to,
    subject: 'Đặt lại mật khẩu SocialNet',
    html: `
      <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản SocialNet này.</p>
      <p><a href="${resetUrl}">Nhấn vào đây để đặt lại mật khẩu</a> (liên kết có hiệu lực trong 1 giờ).</p>
      <p>Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
    `,
  });
}
