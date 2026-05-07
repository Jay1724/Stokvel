import { Router, Request, Response } from 'express';
import db from '../database/db';
import { sendReminderNotifications } from '../services/twilio';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const reminders = db.prepare(`
    SELECT r.*, m.name as member_name
    FROM reminders r
    LEFT JOIN members m ON r.member_id = m.id
    WHERE r.stokvel_id = ?
    ORDER BY r.due_date ASC, r.created_at DESC
  `).all(stokvelId);
  res.json(reminders);
});

router.post('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const { member_id, type, title, message, due_date } = req.body;
  if (!type || !title || !message || !due_date) {
    return res.status(400).json({ error: 'type, title, message, and due_date are required' });
  }
  const result = db.prepare(
    'INSERT INTO reminders (stokvel_id, member_id, type, title, message, due_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(stokvelId, member_id || null, type, title, message, due_date);
  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(reminder);
});

router.put('/:id/read', (req: Request, res: Response) => {
  db.prepare('UPDATE reminders SET is_read = 1 WHERE id = ? AND stokvel_id = ?').run(req.params.id, req.params.stokvelId);
  return res.json({ success: true });
});

router.put('/:id/unread', (req: Request, res: Response) => {
  db.prepare('UPDATE reminders SET is_read = 0 WHERE id = ? AND stokvel_id = ?').run(req.params.id, req.params.stokvelId);
  return res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM reminders WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Auto-generate payment reminders for unpaid members this month
router.post('/generate-payment', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const stokvel = db.prepare('SELECT * FROM stokvels WHERE id = ?').get(stokvelId) as any;
  if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });

  const unpaidMembers = db.prepare(`
    SELECT m.* FROM members m
    WHERE m.stokvel_id = ? AND m.active = 1
    AND m.id NOT IN (
      SELECT member_id FROM contributions
      WHERE stokvel_id = ? AND period_month = ? AND period_year = ?
    )
  `).all(stokvelId, stokvelId, month, year) as any[];

  const insert = db.prepare(
    'INSERT INTO reminders (stokvel_id, member_id, type, title, message, due_date) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const dueDate = new Date(year, month - 1, 28).toISOString().split('T')[0];
  const monthLabel = now.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });

  const txn = db.transaction(() => {
    unpaidMembers.forEach((m: any) => {
      insert.run(
        stokvelId, m.id, 'payment',
        `Payment Reminder – ${monthLabel}`,
        `Hi ${m.name}, your contribution of R${stokvel.contribution_amount.toLocaleString('en-ZA')} for ${monthLabel} is outstanding. Please pay before month end.`,
        dueDate
      );
    });
  });
  txn();

  return res.json({ generated: unpaidMembers.length, members: unpaidMembers.map((m: any) => m.name) });
});

// Send pending reminders via WhatsApp/SMS
router.post('/send-notifications', async (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const result = await sendReminderNotifications(parseInt(stokvelId));
  return res.json(result);
});

export default router;
