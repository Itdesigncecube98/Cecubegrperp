import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL || process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  },
});

/**
 * Send an email using the configured SMTP transport.
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body content
 */
export async function sendEmail({ to, subject, html }) {
  const user = process.env.SMTP_EMAIL || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  
  if (!user || !pass) {
    console.warn('SMTP_EMAIL or SMTP_PASSWORD is not set. Mocking email send to:', to);
    console.log(`[MOCK EMAIL]\nSubject: ${subject}\nTo: ${to}\nHtml: ${html.substring(0, 100)}...`);
    return { success: true, mocked: true };
  }

  const mailOptions = {
    from: `"HR Department" <${user}>`,
    to,
    subject,
    html,
    attachments: []
  };

  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  try {
    if (fs.existsSync(logoPath)) {
      mailOptions.attachments.push({
        filename: 'logo.png',
        path: logoPath,
        cid: 'cecubelogo'
      });
    }
  } catch (e) {
    console.error('Error attaching logo:', e);
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}
