import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || '',
});

export async function POST(req: Request) {
  try {
    if (!process.env.QSTASH_TOKEN) {
        throw new Error("Missing QSTASH_TOKEN in environment variables.");
    }

    const body = await req.json();
    
    let to = body.to;
    let subject = body.subject;
    let html = body.html;
    let scheduleTime = body.scheduleTime;
    let scheduledEmailId = body.scheduledEmailId || null;

    // Check if this is a Supabase Database Webhook INSERT event
    if (body.record && body.table === 'scheduled_emails') {
      const record = body.record;
      to = record.to_email;
      subject = `LifeSync Emlékeztető: ${record.event_title}`;
      scheduledEmailId = record.id;
      html = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; color: white; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
          <div style="background: linear-gradient(135deg, #ffb74d, #ff7043); padding: 35px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 1px; color: white;">LifeSync</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">Időzített emlékeztető a naptáradból</p>
          </div>
          <div style="padding: 35px 30px; background: #121225;">
            <h2 style="color: #ffb74d; margin-top: 0; font-size: 24px; font-weight: 600; line-height: 1.4;">${record.event_title}</h2>
            <div style="margin: 20px 0; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
              <p style="margin: 0 0 8px; opacity: 0.6; font-size: 13px; letter-spacing: 1px;">DÁTUM</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: white;">📅 ${record.event_date}</p>
            </div>
            ${record.event_desc ? `
              <div style="margin: 20px 0;">
                <p style="margin: 0 0 8px; opacity: 0.6; font-size: 13px;">LEÍRÁS</p>
                <p style="margin: 0; font-size: 15px; opacity: 0.85; line-height: 1.6; white-space: pre-wrap;">📝 ${record.event_desc}</p>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;" />
            <p style="opacity: 0.4; font-size: 11px; text-align: center; margin: 0; letter-spacing: 0.5px;">Ez egy automatikus értesítő a LifeSync alkalmazásból.</p>
          </div>
        </div>
      `;
      if (record.send_at) {
        scheduleTime = new Date(record.send_at);
      }
    }

    if (!to) {
      throw new Error("Recipient email address (to) is missing in payload.");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const res = await qstash.publishJSON({
      url: `${baseUrl}/api/send-email`,
      body: { to, subject, html, scheduledEmailId },
      notBefore: scheduleTime,
    });

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
