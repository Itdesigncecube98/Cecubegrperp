import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '../../../lib/prisma';

const smtpUser = process.env.SMTP_EMAIL || '';
const smtpPassword = process.env.SMTP_PASSWORD || '';
const defaultFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser || 'hr@cecubeindia.com';
const defaultFromName = process.env.SMTP_FROM_NAME || 'Cecube HR';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser,
    pass: smtpPassword
  }
});

export async function GET() {
  try {
    const logs = await prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Email log fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing email log ID' }, { status: 400 });
    }

    await prisma.emailLog.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete email log' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { subject, message, recipientIds, attachment, emailType = 'general', sentBy, documentName, documentTypeLabel, senderEmail, senderName } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    let employees;
    if (recipientIds && recipientIds.length > 0) {
      employees = await prisma.employee.findMany({ where: { id: { in: recipientIds } } });
    } else {
      employees = await prisma.employee.findMany();
    }

    const emails = employees.map(e => e.email).filter(Boolean);
    const names = employees.map(e => e.name).filter(Boolean);

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No valid email recipients found' }, { status: 400 });
    }

    const preferredEmail = String(senderEmail || '').trim().toLowerCase();
    const fallbackEmail = defaultFromEmail || 'hr@cecubeindia.com';
    const fromEmail = preferredEmail === 'support@cecubeindia.com' ? fallbackEmail : (preferredEmail || fallbackEmail);
    const fromName = senderName || defaultFromName;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: fromEmail,
      bcc: emails,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="background: #6366f1; padding: 24px 30px; text-align: center;">
            <div style="display: inline-block; background: #ffffff; border-radius: 10px; padding: 10px 20px;">
              <img src="https://www.cecubeindia.com/images/logo.png" alt="Cecube Engineering India" style="max-height: 48px; max-width: 200px; display: block;" />
            </div>
          </div>
          <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="white-space: pre-line; color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">${message.replace(/\n/g, '<br/>')}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">This email was sent from the Cecube HR portal. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    if (attachment && attachment.data && attachment.filename) {
      mailOptions.attachments = [{
        filename: attachment.filename,
        content: Buffer.from(attachment.data, 'base64'),
        contentType: attachment.contentType || 'application/octet-stream'
      }];
    }

    try {
      await transporter.sendMail(mailOptions);

      if (emailType === 'document' && attachment && attachment.data && attachment.filename) {
        const documentItems = employees.map(employee => ({
          employeeId: employee.id,
          documentType: documentTypeLabel || 'Company',
          documentName: documentName || attachment.filename,
          documentNumber: null,
          expiryDate: null,
          fileData: attachment.data,
          fileName: attachment.filename,
          fileType: attachment.contentType || 'application/octet-stream'
        }));
        await prisma.employeeDocument.createMany({ data: documentItems });
      }

      await prisma.emailLog.create({
        data: {
          subject,
          message,
          recipientCount: emails.length,
          recipientEmails: emails.join(', '),
          recipientNames: names.join(', '),
          attachmentName: attachment?.filename || null,
          emailType,
          status: 'SENT',
          sentBy: sentBy || senderEmail || defaultFromEmail || null
        }
      });

      return NextResponse.json({ success: true, sent: emails.length });
    } catch (sendErr) {
      await prisma.emailLog.create({
        data: {
          subject,
          message,
          recipientCount: emails.length,
          recipientEmails: emails.join(', '),
          recipientNames: names.join(', '),
          attachmentName: attachment?.filename || null,
          emailType,
          status: 'FAILED',
          errorMessage: sendErr.message,
          sentBy: sentBy || senderEmail || defaultFromEmail || null
        }
      }).catch(() => {});

      throw sendErr;
    }
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
