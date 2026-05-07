import { Router, Request, Response } from 'express';
import db from '../database/db';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const meetings = db.prepare(
    'SELECT * FROM meetings WHERE stokvel_id = ? ORDER BY date DESC'
  ).all(stokvelId);
  res.json(meetings);
});

router.get('/:id', (req: Request, res: Response) => {
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  const attendance = db.prepare(`
    SELECT ma.*, m.name as member_name
    FROM meeting_attendance ma
    JOIN members m ON ma.member_id = m.id
    WHERE ma.meeting_id = ?
  `).all(req.params.id);

  return res.json({ ...meeting as object, attendance });
});

router.post('/', (req: Request, res: Response) => {
  const { stokvelId } = req.params;
  const { title, date, time, location, agenda, status } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date are required' });

  const result = db.prepare(
    'INSERT INTO meetings (stokvel_id, title, date, time, location, agenda, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(stokvelId, title, date, time || null, location || null, agenda || null, status || 'scheduled');

  // Auto-create attendance rows for all active members
  const members = db.prepare('SELECT id FROM members WHERE stokvel_id = ? AND active = 1').all(stokvelId) as any[];
  const insertAttendance = db.prepare('INSERT OR IGNORE INTO meeting_attendance (meeting_id, member_id, attended) VALUES (?, ?, 0)');
  members.forEach((m: any) => insertAttendance.run(result.lastInsertRowid, m.id));

  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(meeting);
});

router.put('/:id', (req: Request, res: Response) => {
  const { title, date, time, location, agenda, minutes, status } = req.body;
  const existing = db.prepare('SELECT id FROM meetings WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Meeting not found' });

  db.prepare(
    'UPDATE meetings SET title = ?, date = ?, time = ?, location = ?, agenda = ?, minutes = ?, status = ? WHERE id = ?'
  ).run(title, date, time || null, location || null, agenda || null, minutes || null, status, req.params.id);

  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
  return res.json(meeting);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM meetings WHERE id = ? AND stokvel_id = ?').get(req.params.id, req.params.stokvelId);
  if (!existing) return res.status(404).json({ error: 'Meeting not found' });
  db.prepare('DELETE FROM meetings WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// Update attendance
router.put('/:id/attendance', (req: Request, res: Response) => {
  const { attendance } = req.body; // [{ member_id, attended }]
  const update = db.prepare('UPDATE meeting_attendance SET attended = ? WHERE meeting_id = ? AND member_id = ?');
  const txn = db.transaction(() => {
    attendance.forEach(({ member_id, attended }: { member_id: number; attended: boolean }) => {
      update.run(attended ? 1 : 0, req.params.id, member_id);
    });
  });
  txn();
  const updated = db.prepare(`
    SELECT ma.*, m.name as member_name
    FROM meeting_attendance ma
    JOIN members m ON ma.member_id = m.id
    WHERE ma.meeting_id = ?
  `).all(req.params.id);
  return res.json(updated);
});

export default router;
