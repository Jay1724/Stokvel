import db from '../database/db';

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row ? row.value : null;
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || getSetting('twilio_account_sid');
  const authToken = process.env.TWILIO_AUTH_TOKEN || getSetting('twilio_auth_token');
  const fromNumber = process.env.TWILIO_FROM_NUMBER || getSetting('twilio_from_number');
  const channel = process.env.TWILIO_CHANNEL || getSetting('twilio_channel') || 'sms';
  return { accountSid, authToken, fromNumber, channel };
}

export function isTwilioConfigured(): boolean {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();
  return !!(accountSid && authToken && fromNumber);
}

export async function sendNotification(to: string, message: string): Promise<{ success: boolean; channel: string; error?: string }> {
  const { accountSid, authToken, fromNumber, channel } = getTwilioConfig();

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, channel, error: 'Twilio not configured' };
  }

  // Normalise SA number to E.164
  let toNumber = to.replace(/\s+/g, '').replace(/^0/, '+27');
  if (!toNumber.startsWith('+')) toNumber = `+${toNumber}`;

  try {
    const twilio = require('twilio')(accountSid, authToken);
    const from = channel === 'whatsapp' ? `whatsapp:${fromNumber}` : fromNumber;
    const toAddr = channel === 'whatsapp' ? `whatsapp:${toNumber}` : toNumber;

    await twilio.messages.create({ body: message, from, to: toAddr });
    return { success: true, channel };
  } catch (err: any) {
    return { success: false, channel, error: err.message || 'Failed to send' };
  }
}

export async function sendReminderNotifications(stokvelId: number): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!isTwilioConfigured()) return { sent: 0, failed: 0, skipped: 0 };

  const reminders = db.prepare(`
    SELECT r.*, m.phone, m.name as member_name
    FROM reminders r
    LEFT JOIN members m ON r.member_id = m.id
    WHERE r.stokvel_id = ? AND r.is_read = 0 AND r.notification_sent = 0
  `).all(stokvelId) as any[];

  let sent = 0, failed = 0, skipped = 0;

  for (const reminder of reminders) {
    const phone = reminder.phone;
    if (!phone) { skipped++; continue; }

    const result = await sendNotification(phone, `${reminder.title}\n\n${reminder.message}`);
    if (result.success) {
      db.prepare('UPDATE reminders SET notification_sent = 1, notification_channel = ? WHERE id = ?')
        .run(result.channel, reminder.id);
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, skipped };
}
