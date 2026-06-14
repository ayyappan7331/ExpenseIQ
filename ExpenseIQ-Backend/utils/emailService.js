const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an OTP code via email.
 */
const sendOtpEmail = async (to, code, purpose) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn('SMTP credentials not configured. Skipping email sending.');
    return false;
  }

  let subject = 'ExpenseIQ - Your Verification Code';
  let body = `Your verification code is: ${code}\n\nThis code will expire shortly.`;

  if (purpose === 'login') {
    subject = 'ExpenseIQ - Your Login Code';
    body = `Your secure login code for ExpenseIQ is: ${code}\n\nPlease enter this code to securely log in.`;
  } else if (purpose === 'reset') {
    subject = 'ExpenseIQ - Password Reset Code';
    body = `You requested a password reset for ExpenseIQ.\n\nYour reset code is: ${code}\n\nIf you did not request this, please ignore this email.`;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ExpenseIQ" <noreply@expenseiq.com>',
      to,
      subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #6d52d8;">ExpenseIQ</h2>
          <p>${body.replace(/\n/g, '<br/>')}</p>
        </div>
      `,
    });
    logger.info({ messageId: info.messageId, to, purpose }, 'Email sent successfully');
    return true;
  } catch (err) {
    logger.error({ err, to }, 'Failed to send email');
    return false;
  }
};

module.exports = { sendOtpEmail };
