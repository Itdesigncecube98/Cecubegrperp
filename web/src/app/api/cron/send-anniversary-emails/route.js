import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    // Check if the request is from Vercel Cron or local
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials missing. Email sending skipped.');
      return NextResponse.json({ error: 'SMTP credentials missing' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail', // Fallback, but ideally configured by provider (e.g. Hostinger, Outlook)
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const employees = await prisma.employee.findMany();
    
    // Get today's date for comparison strictly in IST timezone (Asia/Kolkata)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const istDateString = new Intl.DateTimeFormat('en-CA', options).format(new Date()); // Outputs YYYY-MM-DD
    const [yyyy, mm, dd] = istDateString.split('-');
    const todayMonthDay = `${mm}-${dd}`;
    const todayFullDate = `${yyyy}-${mm}-${dd}`;

    const todayHoliday = await prisma.holiday.findUnique({
      where: { date: todayFullDate }
    });

    let sentCount = 0;
    const logs = [];

    for (const emp of employees) {
      if (!emp.email && !emp.otherEmail) continue;
      
      const targetEmail = emp.email || emp.otherEmail;
      
      // Date formats can be YYYY-MM-DD or something else. We just want to check if it ends with MM-DD.
      const isBirthday = emp.dateOfBirth && emp.dateOfBirth.endsWith(todayMonthDay);
      const isWorkAnniversary = emp.joinedDate && emp.joinedDate.endsWith(todayMonthDay);
      const isMarriageAnniversary = emp.marriageAnniversary && emp.marriageAnniversary.endsWith(todayMonthDay);

      const emailsToSend = [];

      const formatOrgName = (org) => {
        if (!org) return '';
        let name = org.replace(/-/g, ' ');
        name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        if (name.toLowerCase() === 'cecube engg' || name.toLowerCase() === 'cecube engineering') {
          return 'Cecube Engg India';
        }
        return name;
      };

      if (isBirthday) {
        emailsToSend.push({
          type: 'Birthday',
          subject: `Happy Birthday, ${emp.name}! 🎉`,
          message: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4f46e5;">Happy Birthday, ${emp.name}!</h2>
            <p>On behalf of everyone at ${emp.organisation ? formatOrgName(emp.organisation) : 'Cecube Group'}, we want to wish you a very happy birthday!</p>
            <p>May your day be filled with joy and your year ahead be full of success.</p>
            <br/>
            <p>Warm Regards,</p>
            <p><strong>HR Team</strong><br/>${emp.organisation ? formatOrgName(emp.organisation) + '<br/>' : ''}Cecube Group</p>
          </div>`
        });
      }

      if (isMarriageAnniversary) {
        emailsToSend.push({
          type: 'Marriage Anniversary',
          subject: `Happy Marriage Anniversary, ${emp.name}! 💍`,
          message: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #ec4899;">Happy Marriage Anniversary, ${emp.name}!</h2>
            <p>Wishing you and your spouse a very happy anniversary!</p>
            <p>May your journey together continue to be filled with love, joy, and happiness.</p>
            <br/>
            <p>Warm Regards,</p>
            <p><strong>HR Team</strong><br/>${emp.organisation ? formatOrgName(emp.organisation) + '<br/>' : ''}Cecube Group</p>
          </div>`
        });
      }

      if (isWorkAnniversary) {
        emailsToSend.push({
          type: 'Work Anniversary',
          subject: `Happy Work Anniversary, ${emp.name}! 🌟`,
          message: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #10b981;">Happy Work Anniversary, ${emp.name}!</h2>
            <p>Thank you for being such a valuable member of our team at ${emp.organisation ? formatOrgName(emp.organisation) : 'Cecube Group'}.</p>
            <p>We truly appreciate your dedication and hard work over the time you have been with us!</p>
            <br/>
            <p>Warm Regards,</p>
            <p><strong>HR Team</strong><br/>${emp.organisation ? formatOrgName(emp.organisation) + '<br/>' : ''}Cecube Group</p>
          </div>`
        });
      }

      if (todayHoliday) {
        emailsToSend.push({
          type: 'Holiday',
          subject: `Happy ${todayHoliday.name}! 🌟`,
          message: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #f59e0b;">Happy ${todayHoliday.name}!</h2>
            <p>Dear ${emp.name},</p>
            <p>On behalf of Cecube Engineering India Pvt Ltd, we wish you a very Happy ${todayHoliday.name}!</p>
            <p>Enjoy your day off!</p>
            <br/>
            <p>Warm Regards,</p>
            <p><strong>HR Team</strong><br/>Cecube Engineering India Pvt Ltd</p>
          </div>`
        });
      }

      for (const email of emailsToSend) {
        try {
          await transporter.sendMail({
            from: `"HR Team - Cecube Engineering" <${process.env.SMTP_USER}>`,
            to: targetEmail,
            subject: email.subject,
            html: email.message,
          });
          
          logs.push(`Sent ${email.type} email to ${emp.name} (${targetEmail})`);
          sentCount++;
        } catch (err) {
          logs.push(`Failed to send ${email.type} email to ${emp.name}: ${err.message}`);
          console.error('Email send error:', err);
        }
      }
    }

    return NextResponse.json({ success: true, sentCount, logs });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
