import { Router, Response } from 'express';
import db from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isTwilioConfigured, sendNotification } from '../services/twilio';

const router = Router();
router.use(authenticate);

const ALLOWED_KEYS = [
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_from_number',
  'twilio_channel',
];

router.get('/', (_req: AuthRequest, res: Response) => {
  const settings: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    // Mask sensitive values
    if (row) {
      settings[key] = key.includes('token') || key.includes('sid')
        ? row.value.slice(0, 6) + '•'.repeat(Math.max(0, row.value.length - 6))
        : row.value;
    }
  }
  settings['twilio_configured'] = isTwilioConfigured() ? 'true' : 'false';
  // Expose channel from env if set
  if (process.env.TWILIO_CHANNEL) settings['twilio_channel'] = process.env.TWILIO_CHANNEL;
  return res.json(settings);
});

router.put('/', (req: AuthRequest, res: Response) => {
  const updates = req.body as Record<string, string>;
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const txn = db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (ALLOWED_KEYS.includes(key) && value) {
        upsert.run(key, value);
      }
    }
  });
  txn();
  return res.json({ success: true, configured: isTwilioConfigured() });
});

router.delete('/twilio', (_req: AuthRequest, res: Response) => {
  const txn = db.transaction(() => {
    for (const key of ALLOWED_KEYS) {
      db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    }
  });
  txn();
  return res.json({ success: true });
});

// Test send a WhatsApp/SMS message
router.post('/test-notification', async (req: AuthRequest, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  if (!isTwilioConfigured()) return res.status(400).json({ error: 'Twilio is not configured' });

  const result = await sendNotification(phone, 'Stokvel Manager: Test notification - your setup is working!');
  return res.json(result);
});

export default router;
