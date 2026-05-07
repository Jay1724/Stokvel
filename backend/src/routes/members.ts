import { Router, Request, Response } from 'express';
import db from '../database/db';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const members = db.prepare(
    'SELECT * FROM members WHERE stokvel_id = ? ORDER BY name ASC'
  ).all(stokvelId);
  res.json(members);
});

router.get('/:id', (req: Request, res: Response) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  return res.json(member);
});

router.post('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const { name, phone, email, role, join_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare(
    'INSERT INTO members (stokvel_id, name, phone, email, role, join_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(stokvelId, name, phone || null, email || null, role || 'member', join_date || new Date().toISOString().split('T')[0]);
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(member);
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, phone, email, role, join_date, active } = req.body;
  const existing = db.prepare('SELECT id FROM members WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Member not found' });
  db.prepare(
    'UPDATE members SET name = ?, phone = ?, email = ?, role = ?, join_date = ?, active = ? WHERE id = ?'
  ).run(name, phone || null, email || null, role, join_date, active ?? 1, req.params.id);
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  return res.json(member);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM members WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Member not found' });
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Get contribution summary per member
router.get('/:id/contributions', (req: Request, res: Response) => {
  const contributions = db.prepare(
    'SELECT * FROM contributions WHERE member_id = ? ORDER BY period_year DESC, period_month DESC'
  ).all(req.params.id);
  return res.json(contributions);
});

export default router;
