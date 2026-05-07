import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { contributionApi, memberApi } from '../api';
import { Stokvel } from '../App';
import { format } from 'date-fns';

interface Contribution {
  id: number;
  member_id: number;
  stokvel_id: number;
  amount: number;
  payment_date: string;
  period_month: number;
  period_year: number;
  status: string;
  notes: string | null;
  member_name: string;
}

interface Member { id: number; name: string; active: number; }
interface PaymentStatus { member: Member; contribution: Contribution | null; paid: boolean; }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Contributions({ stokvel }: { stokvel: Stokvel }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [recentContributions, setRecentContributions] = useState<Contribution[]>([]);
  const [form, setForm] = useState({
    member_id: '',
    amount: stokvel.contribution_amount.toString(),
    payment_date: now.toISOString().split('T')[0],
    period_month: (now.getMonth() + 1).toString(),
    period_year: now.getFullYear().toString(),
    status: 'paid',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = useCallback(() => {
    contributionApi.status(stokvel.id, year, month).then(r => setPaymentStatus(r.data));
  }, [stokvel.id, year, month]);

  const loadRecent = useCallback(() => {
    contributionApi.list(stokvel.id).then(r => setRecentContributions(r.data.slice(0, 20)));
  }, [stokvel.id]);

  useEffect(() => { memberApi.list(stokvel.id).then(r => setMembers(r.data.filter((m: Member) => m.active))); }, [stokvel.id]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const quickRecord = async (memberId: number) => {
    try {
      await contributionApi.create(stokvel.id, {
        member_id: memberId,
        amount: stokvel.contribution_amount,
        payment_date: now.toISOString().split('T')[0],
        period_month: month,
        period_year: year,
        status: 'paid',
      });
      loadStatus();
      loadRecent();
    } catch {
      alert('Failed to record payment.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this contribution record?')) return;
    await contributionApi.delete(stokvel.id, id);
    loadStatus();
    loadRecent();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.member_id || !form.amount) { setError('Member and amount are required.'); return; }
    setSubmitting(true);
    try {
      await contributionApi.create(stokvel.id, {
        ...form,
        amount: parseFloat(form.amount),
        period_month: parseInt(form.period_month),
        period_year: parseInt(form.period_year),
      });
      setShowForm(false);
      loadStatus();
      loadRecent();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const paid = paymentStatus.filter(p => p.paid);
  const unpaid = paymentStatus.filter(p => !p.paid);
  const totalCollected = paid.reduce((sum, p) => sum + (p.contribution?.amount || 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contributions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track member payments</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {/* Custom record form */}
      {showForm && (
        <div className="card mb-6 border-brand-200">
          <h2 className="font-semibold text-gray-800 mb-4">Record Contribution</h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Member *</label>
              <select className="input" value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}>
                <option value="">Select member...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (R) *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Payment Date</label>
              <input className="input" type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Period Month</label>
              <select className="input" value={form.period_month} onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Period Year</label>
              <input className="input" type="number" value={form.period_year} onChange={e => setForm(f => ({ ...f, period_year: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="label">Notes (optional)</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Record Contribution'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Month selector */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors"><ChevronLeft size={18} /></button>
          <h2 className="font-semibold text-gray-800 text-lg">{MONTHS[month - 1]} {year}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-3 bg-brand-50 rounded-lg">
            <div className="text-xl font-bold text-brand-700">R{totalCollected.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-brand-600 mt-0.5">Collected</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-700">{paid.length}</div>
            <div className="text-xs text-green-600 mt-0.5">Paid</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-700">{unpaid.length}</div>
            <div className="text-xs text-red-600 mt-0.5">Outstanding</div>
          </div>
        </div>

        <div className="space-y-2">
          {paymentStatus.map(({ member, contribution, paid: isPaid }) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200">
              <div className="flex items-center gap-3">
                {isPaid
                  ? <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                  : <XCircle size={18} className="text-red-400 flex-shrink-0" />
                }
                <div>
                  <div className="text-sm font-medium text-gray-700">{member.name}</div>
                  {isPaid && contribution && (
                    <div className="text-xs text-gray-400">
                      R{contribution.amount.toLocaleString('en-ZA')} · {format(new Date(contribution.payment_date), 'd MMM yyyy')}
                      {contribution.notes && ` · ${contribution.notes}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPaid ? (
                  <button onClick={() => handleDelete(contribution!.id)} className="text-xs text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => quickRecord(member.id)}
                    className="text-xs btn-primary py-1 px-3"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
          {paymentStatus.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">No active members to track</p>
          )}
        </div>
      </div>

      {/* Recent contributions */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Recent Contributions</h2>
        {recentContributions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No contributions recorded yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentContributions.map(c => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">{c.member_name}</div>
                  <div className="text-xs text-gray-400">
                    {MONTHS[c.period_month - 1]} {c.period_year} · paid {format(new Date(c.payment_date), 'd MMM yyyy')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">R{c.amount.toLocaleString('en-ZA')}</span>
                  <span className={c.status === 'paid' ? 'badge-paid' : c.status === 'pending' ? 'badge-pending' : 'badge-overdue'}>
                    {c.status}
                  </span>
                  <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
