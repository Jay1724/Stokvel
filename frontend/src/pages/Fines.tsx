import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import { fineApi, memberApi } from '../api';
import { Stokvel } from '../App';
import { format } from 'date-fns';

interface Fine {
  id: number;
  member_id: number;
  member_name: string;
  amount: number;
  reason: string;
  fine_date: string;
  status: string;
  notes: string | null;
}

interface FineSummary {
  member_id: number;
  member_name: string;
  total_fines: number;
  outstanding_amount: number;
  paid_amount: number;
}

interface Member { id: number; name: string; }

const STATUS_COLORS: Record<string, string> = {
  outstanding: 'badge-overdue',
  paid: 'badge-paid',
  waived: 'bg-gray-100 text-gray-500 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
};

const REASONS = [
  'Late payment',
  'Missed meeting',
  'Disrespectful conduct',
  'Late for meeting',
  'Failure to notify absence',
  'Other',
];

const emptyForm = {
  member_id: '',
  amount: '',
  reason: '',
  fine_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function Fines({ stokvel }: { stokvel: Stokvel }) {
  const [fines, setFines] = useState<Fine[]>([]);
  const [summary, setSummary] = useState<FineSummary[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterMember, setFilterMember] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'summary'>('list');

  const load = useCallback(() => {
    fineApi.list(stokvel.id).then(r => setFines(r.data));
    fineApi.summary(stokvel.id).then(r => setSummary(r.data));
  }, [stokvel.id]);

  useEffect(() => {
    memberApi.list(stokvel.id).then(r => setMembers(r.data));
    load();
  }, [stokvel.id, load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.member_id || !form.amount || !form.reason) { setError('Member, amount and reason are required.'); return; }
    setSubmitting(true);
    try {
      await fineApi.create(stokvel.id, { ...form, amount: parseFloat(form.amount) });
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch {
      setError('Failed to issue fine.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fineApi.updateStatus(stokvel.id, id, status);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this fine?')) return;
    await fineApi.delete(stokvel.id, id);
    load();
  };

  const filtered = fines.filter(f => {
    if (filterMember && f.member_id !== parseInt(filterMember)) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    return true;
  });

  const totalOutstanding = fines.filter(f => f.status === 'outstanding').reduce((s, f) => s + f.amount, 0);
  const totalPaid = fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fines</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            R{totalOutstanding.toLocaleString('en-ZA')} outstanding · R{totalPaid.toLocaleString('en-ZA')} collected
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(''); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Issue Fine
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-red-200">
          <h2 className="font-semibold text-gray-800 mb-4">Issue Fine</h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Member *</label>
              <select className="input" value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}>
                <option value="">Select member...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (R) *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50.00" />
            </div>
            <div>
              <label className="label">Reason *</label>
              <select className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                <option value="">Select reason...</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.fine_date} onChange={e => setForm(f => ({ ...f, fine_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details..." />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="btn-danger" disabled={submitting}>{submitting ? 'Issuing...' : 'Issue Fine'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {(['list', 'summary'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'list' ? 'All Fines' : 'By Member'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <select className="input max-w-[180px]" value={filterMember} onChange={e => setFilterMember(e.target.value)}>
              <option value="">All members</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select className="input max-w-[160px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="outstanding">Outstanding</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>
          </div>

          <div className="card">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No fines found</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={16} className={f.status === 'outstanding' ? 'text-red-400' : 'text-gray-300'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{f.member_name}</span>
                          <span className={STATUS_COLORS[f.status]}>{f.status}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {f.reason} · {format(new Date(f.fine_date), 'd MMM yyyy')}
                          {f.notes ? ` · ${f.notes}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">R{f.amount.toLocaleString('en-ZA')}</span>
                      {f.status === 'outstanding' && (
                        <>
                          <button onClick={() => updateStatus(f.id, 'paid')} title="Mark paid" className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100">
                            <CheckCircle size={15} />
                          </button>
                          <button onClick={() => updateStatus(f.id, 'waived')} title="Waive fine" className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                            <MinusCircle size={15} />
                          </button>
                        </>
                      )}
                      {f.status !== 'outstanding' && (
                        <button onClick={() => updateStatus(f.id, 'outstanding')} title="Mark outstanding" className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 text-xs">
                          Reopen
                        </button>
                      )}
                      <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'summary' && (
        <div className="card">
          <div className="divide-y divide-gray-50">
            {summary.map(s => (
              <div key={s.member_id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">{s.member_name}</div>
                  <div className="text-xs text-gray-400">{s.total_fines} fine{s.total_fines !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  {s.outstanding_amount > 0 && (
                    <div>
                      <div className="text-sm font-bold text-red-600">R{s.outstanding_amount.toLocaleString('en-ZA')}</div>
                      <div className="text-xs text-red-400">outstanding</div>
                    </div>
                  )}
                  {s.paid_amount > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-green-600">R{s.paid_amount.toLocaleString('en-ZA')}</div>
                      <div className="text-xs text-green-400">paid</div>
                    </div>
                  )}
                  {s.outstanding_amount === 0 && s.paid_amount === 0 && (
                    <span className="text-xs text-gray-400">No fines</span>
                  )}
                </div>
              </div>
            ))}
            {summary.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No members yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}
