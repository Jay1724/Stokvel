import { Router, Request, Response } from 'express';
import db from '../database/db';

const router = Router({ mergeParams: true });

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Monthly report
router.get('/monthly/:year/:month', (req: Request, res: Response) => {
  const { stokvelId, year, month } = req.params;
  const y = parseInt(year);
  const m = parseInt(month);

  const stokvel = db.prepare('SELECT * FROM stokvels WHERE id = ?').get(stokvelId) as any;
  if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });

  const members = db.prepare('SELECT * FROM members WHERE stokvel_id = ? AND active = 1').all(stokvelId) as any[];

  const contributions = db.prepare(`
    SELECT c.*, m.name as member_name FROM contributions c
    JOIN members m ON c.member_id = m.id
    WHERE c.stokvel_id = ? AND c.period_year = ? AND c.period_month = ?
  `).all(stokvelId, y, m) as any[];

  const payouts = db.prepare(`
    SELECT p.*, m.name as member_name FROM payouts p
    JOIN members m ON p.member_id = m.id
    WHERE p.stokvel_id = ? AND p.period_year = ? AND p.period_month = ?
  `).all(stokvelId, y, m) as any[];

  const finesPaid = db.prepare(`
    SELECT f.*, m.name as member_name FROM fines f
    JOIN members m ON f.member_id = m.id
    WHERE f.stokvel_id = ? AND f.fine_date LIKE ? AND f.status = 'paid'
  `).all(stokvelId, `${y}-${String(m).padStart(2, '0')}%`) as any[];

  const finesIssued = db.prepare(`
    SELECT f.*, m.name as member_name FROM fines f
    JOIN members m ON f.member_id = m.id
    WHERE f.stokvel_id = ? AND f.fine_date LIKE ?
  `).all(stokvelId, `${y}-${String(m).padStart(2, '0')}%`) as any[];

  const totalContributions = contributions.reduce((s: number, c: any) => s + c.amount, 0);
  const totalPayouts = payouts.reduce((s: number, p: any) => s + p.amount, 0);
  const totalFinesPaid = finesPaid.reduce((s: number, f: any) => s + f.amount, 0);
  const totalFinesIssued = finesIssued.reduce((s: number, f: any) => s + f.amount, 0);

  // Per-member breakdown
  const memberBreakdown = members.map((mem: any) => {
    const contrib = contributions.find((c: any) => c.member_id === mem.id);
    const payout = payouts.find((p: any) => p.member_id === mem.id);
    const memberFines = finesIssued.filter((f: any) => f.member_id === mem.id);
    return {
      member: mem,
      contribution: contrib || null,
      paid: !!contrib,
      payout: payout || null,
      fines: memberFines,
      finesTotal: memberFines.reduce((s: number, f: any) => s + f.amount, 0),
    };
  });

  // All-time cumulative
  const allTimeContrib = (db.prepare('SELECT COALESCE(SUM(amount),0) as t FROM contributions WHERE stokvel_id = ?').get(stokvelId) as any).t;
  const allTimePayouts = (db.prepare('SELECT COALESCE(SUM(amount),0) as t FROM payouts WHERE stokvel_id = ?').get(stokvelId) as any).t;
  const allTimeFinesOutstanding = (db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM fines WHERE stokvel_id = ? AND status = 'outstanding'").get(stokvelId) as any).t;

  return res.json({
    stokvel,
    period: { year: y, month: m, label: `${MONTHS[m - 1]} ${y}` },
    summary: {
      totalContributions,
      totalPayouts,
      totalFinesPaid,
      totalFinesIssued,
      netInflow: totalContributions + totalFinesPaid - totalPayouts,
      paidCount: contributions.length,
      unpaidCount: members.length - contributions.length,
      memberCount: members.length,
    },
    allTime: {
      totalContributions: allTimeContrib,
      totalPayouts: allTimePayouts,
      balance: allTimeContrib - allTimePayouts,
      finesOutstanding: allTimeFinesOutstanding,
    },
    memberBreakdown,
    contributions,
    payouts,
    finesIssued,
  });
});

// Annual summary — one row per month
router.get('/annual/:year', (req: Request, res: Response) => {
  const { stokvelId, year } = req.params;
  const y = parseInt(year);

  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const totalContrib = (db.prepare(
      'SELECT COALESCE(SUM(amount),0) as t FROM contributions WHERE stokvel_id = ? AND period_year = ? AND period_month = ?'
    ).get(stokvelId, y, m) as any).t;

    const totalPayout = (db.prepare(
      'SELECT COALESCE(SUM(amount),0) as t FROM payouts WHERE stokvel_id = ? AND period_year = ? AND period_month = ?'
    ).get(stokvelId, y, m) as any).t;

    const finesIssued = (db.prepare(
      "SELECT COALESCE(SUM(amount),0) as t FROM fines WHERE stokvel_id = ? AND fine_date LIKE ?"
    ).get(stokvelId, `${y}-${String(m).padStart(2, '0')}%`) as any).t;

    rows.push({ month: m, label: MONTHS[m - 1], totalContrib, totalPayout, finesIssued });
  }

  const grandTotalContrib = rows.reduce((s, r) => s + r.totalContrib, 0);
  const grandTotalPayout = rows.reduce((s, r) => s + r.totalPayout, 0);

  return res.json({ year: y, months: rows, grandTotalContrib, grandTotalPayout });
});

export default router;
