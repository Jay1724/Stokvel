import { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, BellOff, Zap, CheckCircle } from 'lucide-react';
import { reminderApi, memberApi } from '../api';
import { Stokvel } from '../App';
import { format, isPast } from 'date-fns';

interface Reminder {
  id: number;
  stokvel_id: number;
  member_id: number | null;
  member_name: string | null;
  type: string;
  title: string;
  message: string;
  due_date: string;
  is_read: number;
  created_at: string;
}

interface Member { id: number; name: string; }

const TYPE_COLORS: Record<string, string> = {
  payment: 'bg-yellow-100 text-yellow-700',
  meeting: 'bg-blue-100 text-blue-700',
  general: 'bg-gray-100 text-gray-600',
};

const emptyForm = {
  member_id: '',
  type: 'payment',
  title: '',
  message: '',
  due_date: '',
};

export default function Reminders({ stokvel }: { stokvel: Stokvel }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generateResult, setGenerateResult] = useState('');

  const load = () => reminderApi.list(stokvel.id).then(r => setReminders(r.data));
  useEffect(() => { load(); memberApi.list(stokvel.id).then(r => setMembers(r.data)); }, [stokvel.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.type || !form.title || !form.message || !form.due_date) {
      setError('All fields except member are required.');
      return;
    }
    setSubmitting(true);
    try {
      await reminderApi.create(stokvel.id, { ...form, member_id: form.member_id || null });
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch {
      setError('Failed to create reminder.');
    } finally {
      setSubmitting(false);
    }
  };

  const markRead = async (id: number) => {
    await reminderApi.markRead(stokvel.id, id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_read: 1 } : r));
  };

  const markUnread = async (id: number) => {
    await reminderApi.markUnread(stokvel.id, id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_read: 0 } : r));
  };

  const handleDelete = async (id: number) => {
    await reminderApi.delete(stokvel.id, id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const generatePaymentReminders = async () => {
    setGenerating(true);
    setGenerateResult('');
    try {
      const res = await reminderApi.generatePayment(stokvel.id);
      const { generated, members: names } = res.data;
      if (generated === 0) {
        setGenerateResult('All members have paid this month!');
      } else {
        setGenerateResult(`Generated ${generated} reminder${generated > 1 ? 's' : ''} for: ${names.join(', ')}`);
      }
      load();
    } catch {
      setGenerateResult('Failed to generate reminders.');
    } finally {
      setGenerating(false);
    }
  };

  const unread = reminders.filter(r => !r.is_read);
  const read = reminders.filter(r => r.is_read);
  const overdue = unread.filter(r => isPast(new Date(r.due_date)));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {unread.length} unread{overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generatePaymentReminders}
            disabled={generating}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Zap size={15} />
            {generating ? 'Generating...' : 'Auto-Generate Payment Reminders'}
          </button>
          <button onClick={() => { setShowForm(!showForm); setError(''); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Reminder
          </button>
        </div>
      </div>

      {generateResult && (
        <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-lg text-sm text-brand-700 flex items-center gap-2">
          <CheckCircle size={16} className="text-brand-600" />
          {generateResult}
        </div>
      )}

      {showForm && (
        <div className="card mb-6 border-brand-200">
          <h2 className="font-semibold text-gray-800 mb-4">Create Reminder</h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="payment">Payment</option>
                <option value="meeting">Meeting</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="label">Member (optional)</label>
              <select className="input" value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}>
                <option value="">All members</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. May 2026 Payment Due" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Message *</label>
              <textarea className="input resize-none" rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Reminder message details..." />
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input className="input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Create Reminder'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Unread */}
      {unread.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Pending ({unread.length})
          </h2>
          <div className="space-y-3">
            {unread.map(r => (
              <ReminderCard key={r.id} reminder={r} onMarkRead={markRead} onMarkUnread={markUnread} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Read */}
      {read.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Completed ({read.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {read.map(r => (
              <ReminderCard key={r.id} reminder={r} onMarkRead={markRead} onMarkUnread={markUnread} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {reminders.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No reminders yet</p>
          <p className="text-sm mt-1">Create reminders or auto-generate payment reminders for unpaid members</p>
        </div>
      )}
    </div>
  );
}

function ReminderCard({ reminder, onMarkRead, onMarkUnread, onDelete }: {
  reminder: Reminder;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const isOverdue = !reminder.is_read && isPast(new Date(reminder.due_date));

  return (
    <div className={`card p-4 border ${isOverdue ? 'border-red-200 bg-red-50' : reminder.is_read ? 'border-gray-100' : 'border-yellow-100 bg-yellow-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 p-1.5 rounded-full ${reminder.is_read ? 'bg-gray-100' : isOverdue ? 'bg-red-100' : 'bg-yellow-100'}`}>
            {reminder.is_read
              ? <BellOff size={14} className="text-gray-400" />
              : <Bell size={14} className={isOverdue ? 'text-red-500' : 'text-yellow-600'} />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-sm">{reminder.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[reminder.type] || TYPE_COLORS.general}`}>
                {reminder.type}
              </span>
              {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Overdue</span>}
            </div>
            {reminder.member_name && (
              <div className="text-xs text-gray-500 mt-0.5">For: {reminder.member_name}</div>
            )}
            <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
            <div className="text-xs text-gray-400 mt-1.5">
              Due: {format(new Date(reminder.due_date), 'd MMMM yyyy')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {reminder.is_read ? (
            <button
              onClick={() => onMarkUnread(reminder.id)}
              title="Mark as unread"
              className="p-1.5 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
            >
              <Bell size={15} />
            </button>
          ) : (
            <button
              onClick={() => onMarkRead(reminder.id)}
              title="Mark as done"
              className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <CheckCircle size={15} />
            </button>
          )}
          <button
            onClick={() => onDelete(reminder.id)}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
