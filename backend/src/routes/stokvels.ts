import { Router, Response } from 'express';
import db from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', (req: AuthRequest, res: Response) => {
  const stokvels = db.prepare(`
    SELECT s.* FROM stokvels s
    INNER JOIN stokvel_users su ON su.stokvel_id = s.id
    WHERE su.user_id = ?
    ORDER BY s.created_at DESC
  `).all(req.userId);
  res.json(stokvels);
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  const stokvel = db.prepare(`
    SELECT s.* FROM stokvels s
    INNER JOIN stokvel_users su ON su.stokvel_id = s.id
    WHERE s.id = ? AND su.user_id = ?
  `).get(req.params.id, req.userId);
  if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });
  return res.json(stokvel);
});

router.post('/', (req: AuthRequest, res: Response) => {
  const { name, description, contribution_amount, contribution_frequency } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(
    'INSERT INTO stokvels (owner_id, name, description, contribution_amount, contribution_frequency) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, name, description || null, contribution_amount || 0, contribution_frequency || 'monthly');

  db.prepare('INSERT INTO stokvel_users (user_id, stokvel_id, role) VALUES (?, ?, ?)').run(req.userId, result.lastInsertRowid, 'admin');

  const stokvel = db.prepare('SELECT * FROM stokvels WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(stokvel);
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const { name, description, contribution_amount, contribution_frequency } = req.body;
  const existing = db.prepare(`
    SELECT s.id FROM stokvels s INNER JOIN stokvel_users su ON su.stokvel_id = s.id
    WHERE s.id = ? AND su.user_id = ?
  `).get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Stokvel not found' });

  db.prepare(
    'UPDATE stokvels SET name = ?, description = ?, contribution_amount = ?, contribution_frequency = ? WHERE id = ?'
  ).run(name, description || null, contribution_amount, contribution_frequency, req.params.id);
  const stokvel = db.prepare('SELECT * FROM stokvels WHERE id = ?').get(req.params.id);
  return res.json(stokvel);
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.prepare(`
    SELECT s.id FROM stokvels s INNER JOIN stokvel_users su ON su.stokvel_id = s.id
    WHERE s.id = ? AND su.user_id = ? AND su.role = 'admin'
  `).get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Stokvel not found or insufficient permissions' });
  db.prepare('DELETE FROM stokvels WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Dashboard stats
router.get('/:id/stats', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const totalMembers = (db.prepare('SELECT COUNT(*) as count FROM members WHERE stokvel_id = ? AND active = 1').get(id) as any).count;
  const totalContributions = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM contributions WHERE stokvel_id = ?').get(id) as any).total;
  const totalPayouts = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payouts WHERE stokvel_id = ?').get(id) as any).total;
  const totalFinesOutstanding = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM fines WHERE stokvel_id = ? AND status = 'outstanding'").get(id) as any).total;
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

  const stokvel = db.prepare('SELECT payout_order FROM stokvels WHERE id = ?').get(id) as any;
  const payoutOrder: number[] = JSON.parse(stokvel?.payout_order || '[]');
  const lastPayout = db.prepare(
    'SELECT member_id FROM payouts WHERE stokvel_id = ? ORDER BY period_year DESC, period_month DESC LIMIT 1'
  ).get(id) as any;

  let nextPayoutMemberId: number | null = null;
  if (payoutOrder.length > 0) {
    if (!lastPayout) {
      nextPayoutMemberId = payoutOrder[0];
    } else {
      const idx = payoutOrder.indexOf(lastPayout.member_id);
      nextPayoutMemberId = payoutOrder[(idx + 1) % payoutOrder.length] ?? null;
    }
  }

  let nextPayoutMember = null;
  if (nextPayoutMemberId) {
    nextPayoutMember = db.prepare('SELECT id, name FROM members WHERE id = ?').get(nextPayoutMemberId);
  }

  return res.json({
    totalMembers,
    totalContributions,
    totalPayouts,
    totalFinesOutstanding,
    balance: totalContributions - totalPayouts,
    paidThisMonth,
    upcomingMeetings,
    pendingReminders,
    nextPayoutMember,
  });
});

// Payout rotation order
router.put('/:id/payout-order', (req: AuthRequest, res: Response) => {
  const { order } = req.body; // array of member IDs
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of member IDs' });
  db.prepare('UPDATE stokvels SET payout_order = ? WHERE id = ?').run(JSON.stringify(order), req.params.id);
  return res.json({ success: true, order });
});

export default router;
