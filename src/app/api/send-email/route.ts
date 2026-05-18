import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY in environment variables.");
    }

    const { to, subject, html, scheduledEmailId } = await req.json();

    const data = await resend.emails.send({
      from: 'LifeSync <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    // Mark as sent in Supabase if scheduledEmailId is supplied
    if (scheduledEmailId) {
      await supabase.from('scheduled_emails').update({ sent: true }).eq('id', scheduledEmailId);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
