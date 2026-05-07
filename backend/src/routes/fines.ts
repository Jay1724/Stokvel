import { Router, Request, Response } from 'express';
import db from '../database/db';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const fines = db.prepare(`
    SELECT f.*, m.name as member_name
    FROM fines f
    JOIN members m ON f.member_id = m.id
    WHERE f.stokvel_id = ?
    ORDER BY f.fine_date DESC
  `).all(stokvelId);
  res.json(fines);
});

router.post('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const { member_id, amount, reason, fine_date, notes } = req.body;
  if (!member_id || !amount || !reason) {
    return res.status(400).json({ error: 'member_id, amount, and reason are required' });
  }
  const result = db.prepare(
    'INSERT INTO fines (stokvel_id, member_id, amount, reason, fine_date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(stokvelId, member_id, amount, fine_date || new Date().toISOString().split('T')[0], reason, notes || null);

  const fine = db.prepare(`
    SELECT f.*, m.name as member_name FROM fines f
    JOIN members m ON f.member_id = m.id WHERE f.id = ?
  `).get(result.lastInsertRowid);
  return res.status(201).json(fine);
});

router.put('/:id', (req: Request, res: Response) => {
  const { amount, reason, fine_date, status, notes } = req.body;
  const existing = db.prepare('SELECT id FROM fines WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Fine not found' });

  db.prepare(
    'UPDATE fines SET amount = ?, reason = ?, fine_date = ?, status = ?, notes = ? WHERE id = ?'
  ).run(amount, reason, fine_date, status, notes || null, req.params.id);
  const fine = db.prepare(`
    SELECT f.*, m.name as member_name FROM fines f
    JOIN members m ON f.member_id = m.id WHERE f.id = ?
  `).get(req.params.id);
  return res.json(fine);
});

router.patch('/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['outstanding', 'paid', 'waived'].includes(status)) {
    return res.status(400).json({ error: 'status must be outstanding, paid, or waived' });
  }
  db.prepare('UPDATE fines SET status = ? WHERE id = ? AND stokvel_id = ?').run(status, req.params.id, req.params.stokvelId);
  return res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM fines WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Fine not found' });
  db.prepare('DELETE FROM fines WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Summary per member
router.get('/summary', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const summary = db.prepare(`
    SELECT
      m.id as member_id, m.name as member_name,
      COUNT(f.id) as total_fines,
      COALESCE(SUM(CASE WHEN f.status = 'outstanding' THEN f.amount ELSE 0 END), 0) as outstanding_amount,
      COALESCE(SUM(CASE WHEN f.status = 'paid' THEN f.amount ELSE 0 END), 0) as paid_amount
    FROM members m
    LEFT JOIN fines f ON f.member_id = m.id AND f.stokvel_id = ?
    WHERE m.stokvel_id = ? AND m.active = 1
    GROUP BY m.id, m.name
    ORDER BY outstanding_amount DESC
  `).all(stokvelId, stokvelId);
  return res.json(summary);
});

export default router;
