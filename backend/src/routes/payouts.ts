import { Router, Request, Response } from 'express';
import db from '../database/db';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const payouts = db.prepare(`
    SELECT p.*, m.name as member_name
    FROM payouts p
    JOIN members m ON p.member_id = m.id
    WHERE p.stokvel_id = ?
    ORDER BY p.period_year DESC, p.period_month DESC
  `).all(stokvelId);
  res.json(payouts);
});

router.post('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const { member_id, amount, payout_date, period_month, period_year, notes } = req.body;
  if (!member_id || !amount || !period_month || !period_year) {
    return res.status(400).json({ error: 'member_id, amount, period_month, and period_year are required' });
  }
  const result = db.prepare(
    'INSERT INTO payouts (stokvel_id, member_id, amount, payout_date, period_month, period_year, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(stokvelId, member_id, amount, payout_date || new Date().toISOString().split('T')[0], period_month, period_year, notes || null);

  const payout = db.prepare(`
    SELECT p.*, m.name as member_name
    FROM payouts p JOIN members m ON p.member_id = m.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);
  return res.status(201).json(payout);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM payouts WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Payout not found' });
  db.prepare('DELETE FROM payouts WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Get rotation schedule: all active members in order, with their payout history
router.get('/rotation', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const stokvel = db.prepare('SELECT payout_order FROM stokvels WHERE id = ?').get(stokvelId) as any;
  if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });

  const order: number[] = JSON.parse(stokvel.payout_order || '[]');
  const members = db.prepare('SELECT * FROM members WHERE stokvel_id = ? AND active = 1').all(stokvelId) as any[];
  const payouts = db.prepare('SELECT * FROM payouts WHERE stokvel_id = ? ORDER BY period_year ASC, period_month ASC').all(stokvelId) as any[];

  // Ordered members with their payout history
  const orderedMembers = order
    .map(id => members.find((m: any) => m.id === id))
    .filter(Boolean)
    .map((m: any) => ({
      ...m,
      payouts: payouts.filter((p: any) => p.member_id === m.id),
    }));

  // Members not yet in the rotation order
  const unordered = members
    .filter((m: any) => !order.includes(m.id))
    .map((m: any) => ({ ...m, payouts: payouts.filter((p: any) => p.member_id === m.id) }));

  // Determine next recipient: first in order who hasn't received a payout yet
  const lastPayout = payouts[payouts.length - 1];
  let nextIndex = 0;
  if (lastPayout && order.length > 0) {
    const lastIdx = order.indexOf(lastPayout.member_id);
    nextIndex = (lastIdx + 1) % order.length;
  }
  const nextMemberId = order[nextIndex] ?? null;

  return res.json({ order, orderedMembers, unordered, nextMemberId });
});

export default router;
