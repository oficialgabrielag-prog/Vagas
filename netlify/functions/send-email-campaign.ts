import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
console.log('Resend key initialized:', !!process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
console.log('Supabase URL initialized:', !!process.env.SUPABASE_URL);
console.log('Supabase Service Role Key initialized:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

export const handler = async (event: any) => {
  console.log('Function invoked, body:', event.body);
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { subject, content, targetAudience, campaignId, testEmail } = JSON.parse(event.body);
  console.log('Parsed params:', { subject, targetAudience, campaignId, testEmail });

  if (!subject || !content || !campaignId) {
    console.error('Missing required fields');
    return { statusCode: 400, body: 'Missing required fields' };
  }

  try {
    // 1. Fetch recipients securely
    let recipients: { userId: string, email: string }[] = [];
    if (targetAudience === 'test') {
      recipients = [{ userId: 'admin', email: testEmail }];
    } else {
      let query = supabase.from('profiles').select('id, role');
      if (targetAudience === 'candidates') query = query.eq('role', 'candidate');
      if (targetAudience === 'employers') query = query.eq('role', 'employer');
      
      const { data: profiles, error: profErr } = await query;
      if (profErr) throw profErr;

      const { data: users, error: userErr } = await supabase.from('users').select('id, email').in('id', profiles!.map(p => p.id));
      if (userErr) throw userErr;

      const userMap = new Map(users!.map(u => [u.id, u.email]));
      recipients = profiles!.map(p => ({
        userId: p.id,
        email: userMap.get(p.id)
      })).filter(r => r.email) as { userId: string, email: string }[];
    }

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const { data, error } = await resend.emails.send({
            from: 'reply@cunenevagas.online',
            to: recipient.email,
            subject,
            html: content,
          });

          if (error) throw error;

          // Log success (only for non-test)
          if (campaignId !== 'test') {
            await supabase.from('email_campaign_logs').insert([{
              campaign_id: campaignId,
              user_id: recipient.userId,
              status: 'sent',
              sent_at: new Date().toISOString()
            }]);
          }

          return { userId: recipient.userId, status: 'sent' };
        } catch (err: any) {
          // Log failure (only for non-test)
          if (campaignId !== 'test') {
            await supabase.from('email_campaign_logs').insert([{
              campaign_id: campaignId,
              user_id: recipient.userId,
              status: 'failed',
              error_message: err.message
            }]);
          }
          return { userId: recipient.userId, status: 'failed', error: err.message };
        }
      })
    );

    // Update campaign status
    if (campaignId !== 'test') {
      await supabase.from('email_campaigns').update({
        status: 'sent',
        sent_at: new Date().toISOString()
      }).eq('id', campaignId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
