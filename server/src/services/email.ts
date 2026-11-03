import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset your The Retreat password',
    text: `You requested a password reset for The Retreat.

Use this link to reset your password:
${resetUrl}

This link expires in 15 minutes.

If you did not request this, you can ignore this email.`,
  });
}