
import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },

  // Fail faster if the SMTP connection cannot be established.
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,

  // Require encryption when using Gmail on port 587.
  requireTLS: smtpPort === 587,
});

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
) {
  try {
    console.log('SMTP: Attempting to send password reset email');

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset your The Retreat password',
      text: `You requested a password reset for The Retreat.

Use this link to reset your password:
${resetUrl}

This link expires in 15 minutes.

If you did not request this, you can ignore this email.`,
    });

    console.log('SMTP: Email accepted by server:', info.messageId);
  } catch (error) {
    console.error('SMTP: Email sending failed:', error);
    throw error;
  }
}
