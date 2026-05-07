import { Router, Request, Response } from 'express';
import db from '../database/db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const stokvels = db.prepare('SELECT * FROM stokvels ORDER BY created_at DESC').all();
  res.json(stokvels);
});

router.get('/:id', (req: Request, res: Response) => {
  const stokvel = db.prepare('SELECT * FROM stokvels WHERE id = ?').get(req.params.id);
  if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });
  return res.json(stokvel);
});

router.post('/', (req: Request, res: Response) => {
  const { name, description, contribution_amount, contribution_frequency } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare(
    'INSERT INTO stokvels (name, description, contribution_amount, contribution_frequency) VALUES (?, ?, ?, ?)'
  ).run(name, description || null, contribution_amount || 0, contribution_frequency || 'monthly');
  const stokvel = db.prepare('SELECT * FROM stokvels WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(stokvel);
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, description, contribution_amount, contribution_frequency } = req.body;
  const existing = db.prepare('SELECT id FROM stokvels WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Stokvel not found' });
  db.prepare(
    'UPDATE stokvels SET name = ?, description = ?, contribution_amount = ?, contribution_frequency = ? WHERE id = ?'
  ).run(name, description || null, contribution_amount, contribution_frequency, req.params.id);
  const stokvel = db.prepare('SELECT * FROM stokvels WHERE id = ?').get(req.params.id);
  return res.json(stokvel);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM stokvels WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Stokvel not found' });
  db.prepare('DELETE FROM stokvels WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Dashboard stats for a stokvel
router.get('/:id/stats', (req: Request, res: Response) => {
  const { id } = req.params;
  const totalMembers = (db.prepare('SELECT COUNT(*) as count FROM members WHERE stokvel_id = ? AND active = 1').get(id) as any).count;
  const totalContributions = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM contributions WHERE stokvel_id = ?').get(id) as any).total;
  const thisMonth = new Date();
  const paidThisMonth = (db.prepare(
    'SELECT COUNT(*) as count FROM contributions WHERE stokvel_id = ? AND period_month = ? AND period_year = ?'
  ).get(id, thisMonth.getMonth() + 1, thisMonth.getFullYear()) as any).count;
  const upcomingMeetings = (db.prepare(
    "SELECT COUNT(*) as count FROM meetings WHERE stokvel_id = ? AND status = 'scheduled' AND date >= date('now')"
  ).get(id) as any).count;
  const pendingReminders = (db.prepare(
    'SELECT COUNT(*) as count FROM reminders WHERE stokvel_id = ? AND is_read = 0'
  ).get(id) as any).count;

  return res.json({
    totalMembers,
    totalContributions,
    paidThisMonth,
    upcomingMeetings,
    pendingReminders,
  });
});

export default router;
