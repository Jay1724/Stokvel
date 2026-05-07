import { Router, Request, Response } from 'express';
import db from '../database/db';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const { month, year } = req.query;
  let query = `
    SELECT c.*, m.name as member_name
    FROM contributions c
    JOIN members m ON c.member_id = m.id
    WHERE c.stokvel_id = ?
  `;
  const params: (string | number)[] = [stokvelId];
  if (month) { query += ' AND c.period_month = ?'; params.push(Number(month)); }
  if (year) { query += ' AND c.period_year = ?'; params.push(Number(year)); }
  query += ' ORDER BY c.period_year DESC, c.period_month DESC, m.name ASC';
  const contributions = db.prepare(query).all(...params);
  res.json(contributions);
});

router.post('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const { member_id, amount, payment_date, period_month, period_year, status, notes } = req.body;
  if (!member_id || !amount || !period_month || !period_year) {
    return res.status(400).json({ error: 'member_id, amount, period_month, and period_year are required' });
  }
  const result = db.prepare(
    'INSERT INTO contributions (member_id, stokvel_id, amount, payment_date, period_month, period_year, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(member_id, stokvelId, amount, payment_date || new Date().toISOString().split('T')[0], period_month, period_year, status || 'paid', notes || null);
  const contribution = db.prepare(
    'SELECT c.*, m.name as member_name FROM contributions c JOIN members m ON c.member_id = m.id WHERE c.id = ?'
  ).get(result.lastInsertRowid);
  return res.status(201).json(contribution);
});

router.put('/:id', (req: Request, res: Response) => {
  const { amount, payment_date, period_month, period_year, status, notes } = req.body;
  const existing = db.prepare('SELECT id FROM contributions WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Contribution not found' });
  db.prepare(
    'UPDATE contributions SET amount = ?, payment_date = ?, period_month = ?, period_year = ?, status = ?, notes = ? WHERE id = ?'
  ).run(amount, payment_date, period_month, period_year, status, notes || null, req.params.id);
  const contribution = db.prepare(
    'SELECT c.*, m.name as member_name FROM contributions c JOIN members m ON c.member_id = m.id WHERE c.id = ?'
  ).get(req.params.id);
  return res.json(contribution);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM contributions WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Contribution not found' });
  db.prepare('DELETE FROM contributions WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Get payment status for a given month/year
router.get('/status/:year/:month', (req: Request, res: Response) => {
  const { stokvelId, year, month } = req.params;
  const members = db.prepare('SELECT * FROM members WHERE stokvel_id = ? AND active = 1').all(stokvelId) as any[];
  const contributions = db.prepare(
    'SELECT * FROM contributions WHERE stokvel_id = ? AND period_year = ? AND period_month = ?'
  ).all(stokvelId, year, month) as any[];

  const status = members.map((m: any) => {
    const contribution = contributions.find((c: any) => c.member_id === m.id);
    return {
      member: m,
      contribution: contribution || null,
      paid: !!contribution,
    };
  });
  return res.json(status);
});

export default router;
