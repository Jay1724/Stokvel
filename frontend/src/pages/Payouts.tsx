import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Trophy, RotateCcw } from 'lucide-react';
import { payoutApi, memberApi, stokvelApi } from '../api';
import { Stokvel } from '../App';
import { format } from 'date-fns';

interface Member { id: number; name: string; active: number; }
interface Payout { id: number; member_id: number; member_name: string; amount: number; payout_date: string; period_month: number; period_year: number; notes: string | null; }
interface RotationMember extends Member { payouts: Payout[]; }
interface Rotation { order: number[]; orderedMembers: RotationMember[]; unordered: RotationMember[]; nextMemberId: number | null; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Payouts({ stokvel }: { stokvel: Stokvel }) {
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState({
    member_id: '',
    amount: stokvel.contribution_amount.toString(),
    payout_date: new Date().toISOString().split('T')[0],
    period_month: (new Date().getMonth() + 1).toString(),
    period_year: new Date().getFullYear().toString(),
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadRotation = useCallback(() => payoutApi.rotation(stokvel.id).then(r => setRotation(r.data)), [stokvel.id]);
  const loadPayouts = useCallback(() => payoutApi.list(stokvel.id).then(r => setPayouts(r.data)), [stokvel.id]);

  useEffect(() => {
    memberApi.list(stokvel.id).then(r => setMembers(r.data.filter((m: Member) => m.active)));
    loadRotation();
    loadPayouts();
  }, [stokvel.id, loadRotation, loadPayouts]);

  const moveUp = (index: number) => {
    if (!rotation || index === 0) return;
    const newOrder = [...rotation.order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setRotation(r => r ? { ...r, order: newOrder } : r);
  };

  const moveDown = (index: number) => {
    if (!rotation || index === rotation.order.length - 1) return;
    const newOrder = [...rotation.order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setRotation(r => r ? { ...r, order: newOrder } : r);
  };

  const addToRotation = (memberId: number) => {
    if (!rotation) return;
    const newOrder = [...rotation.order, memberId];
    setRotation(r => r ? { ...r, order: newOrder } : r);
  };

  const removeFromRotation = (memberId: number) => {
    if (!rotation) return;
    const newOrder = rotation.order.filter(id => id !== memberId);
    setRotation(r => r ? { ...r, order: newOrder } : r);
  };

  const saveOrder = async () => {
    if (!rotation) return;
    setSavingOrder(true);
    await stokvelApi.updatePayoutOrder(stokvel.id, rotation.order);
    await loadRotation();
    setSavingOrder(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.member_id || !form.amount) { setError('Member and amount are required.'); return; }
    setSubmitting(true);
    try {
      await payoutApi.create(stokvel.id, {
        ...form,
        amount: parseFloat(form.amount),
        period_month: parseInt(form.period_month),
        period_year: parseInt(form.period_year),
      });
      setShowForm(false);
      loadPayouts();
      loadRotation();
    } catch {
      setError('Failed to record payout.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this payout record?')) return;
    await payoutApi.delete(stokvel.id, id);
    loadPayouts();
    loadRotation();
  };

  const nextMember = rotation && rotation.nextMemberId
    ? members.find(m => m.id === rotation.nextMemberId)
    : null;

  const totalPaidOut = payouts.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {payouts.length} payouts · R{totalPaidOut.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} total paid out
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setError(''); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Record Payout
        </button>
      </div>

      {/* Next payout banner */}
      {nextMember && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
          <Trophy size={22} className="text-yellow-500 flex-shrink-0" />
          <div>
            <div className="font-semibold text-yellow-800">Next payout recipient</div>
            <div className="text-yellow-700 text-sm">{nextMember.name} is next in the rotation</div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6 border-brand-200">
          <h2 className="font-semibold text-gray-800 mb-4">Record Payout</h2>
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
              <label className="label">Payout Date</label>
              <input className="input" type="date" value={form.payout_date} onChange={e => setForm(f => ({ ...f, payout_date: e.target.value }))} />
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
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Record Payout'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rotation order */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <RotateCcw size={17} className="text-brand-600" /> Payout Rotation
            </h2>
            <button onClick={saveOrder} disabled={savingOrder} className="btn-primary text-sm py-1.5">
              {savingOrder ? 'Saving...' : 'Save Order'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">Drag to reorder — use arrows to adjust the rotation sequence</p>

          {rotation?.orderedMembers.length === 0 && rotation.unordered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Add members to set up the rotation</p>
          )}

          <div className="space-y-2">
            {rotation?.orderedMembers.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border ${m.id === rotation.nextMemberId ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100 bg-gray-50'}`}>
                <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700">{m.name}</div>
                  <div className="text-xs text-gray-400">
                    {m.payouts.length > 0
                      ? `Last payout: ${MONTHS[m.payouts[m.payouts.length - 1].period_month - 1]} ${m.payouts[m.payouts.length - 1].period_year}`
                      : 'No payouts yet'}
                  </div>
                </div>
                {m.id === rotation.nextMemberId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Next</span>
                )}
                <div className="flex gap-0.5">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 transition-colors"><ArrowUp size={14} /></button>
                  <button onClick={() => moveDown(i)} disabled={i === (rotation?.orderedMembers.length ?? 0) - 1} className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 transition-colors"><ArrowDown size={14} /></button>
                  <button onClick={() => removeFromRotation(m.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {rotation && rotation.unordered.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Not in rotation</p>
              <div className="space-y-1">
                {rotation.unordered.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded border border-dashed border-gray-200">
                    <span className="text-sm text-gray-500">{m.name}</span>
                    <button onClick={() => addToRotation(m.id)} className="text-xs btn-secondary py-1 px-2">Add to rotation</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payout history */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Payout History</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No payouts recorded yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {payouts.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 group">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{p.member_name}</div>
                    <div className="text-xs text-gray-400">
                      {MONTHS[p.period_month - 1]} {p.period_year} · {format(new Date(p.payout_date), 'd MMM yyyy')}
                      {p.notes && ` · ${p.notes}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">R{p.amount.toLocaleString('en-ZA')}</span>
                    <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
