
import { Resend } from 'resend';

// Initialize Resend with your API key.
const resend = new Resend(process.env.RESEND_API_KEY);

// Send password reset emails using Resend's HTTPS API.
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!process.env.RESEND_API_KEY || !from) {
    throw new Error('Resend email configuration is missing.');
  }

  try {
    console.log('RESEND: Attempting to send password reset email');

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: 'Reset your The Retreat password',
      text: `You requested a password reset for The Retreat.

Use this link to reset your password:
${resetUrl}

This link expires in 15 minutes.

If you did not request this, you can ignore this email.`,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('RESEND: Email accepted:', data?.id);
  } catch (error) {
    console.error('RESEND: Failed to send password reset email:', error);
    throw error;
  }
}
