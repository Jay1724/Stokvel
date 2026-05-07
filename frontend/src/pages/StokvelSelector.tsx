import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2 } from 'lucide-react';
import { stokvelApi } from '../api';
import { Stokvel } from '../App';

interface Props {
  activeStokvel: Stokvel | null;
  onSelect: (s: Stokvel) => void;
}

const FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'];

export default function StokvelSelector({ onSelect }: Props) {
  const navigate = useNavigate();
  const [stokvels, setStokvels] = useState<Stokvel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    contribution_amount: '',
    contribution_frequency: 'monthly',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    stokvelApi.list().then(r => {
      setStokvels(r.data);
      setLoading(false);
    });
  }, []);

  const handleSelect = (s: Stokvel) => {
    onSelect(s);
    navigate('/dashboard');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.contribution_amount) {
      setError('Name and contribution amount are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await stokvelApi.create({
        ...form,
        contribution_amount: parseFloat(form.contribution_amount),
      });
      setStokvels(prev => [...prev, res.data]);
      setShowForm(false);
      setForm({ name: '', description: '', contribution_amount: '', contribution_frequency: 'monthly' });
      handleSelect(res.data);
    } catch {
      setError('Failed to create stokvel. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this stokvel and all its data?')) return;
    await stokvelApi.delete(id);
    setStokvels(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-600 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Stokvel Manager</h1>
          <p className="text-brand-200">Track contributions, meetings & reminders for your stokvel</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">Your Stokvels</h2>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> New Stokvel
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <h3 className="font-semibold text-gray-700">Create New Stokvel</h3>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <label className="label">Stokvel Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Maphefo Stokvel" />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Contribution Amount (R) *</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.contribution_amount} onChange={e => setForm(f => ({ ...f, contribution_amount: e.target.value }))} placeholder="500" />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select className="input" value={form.contribution_frequency} onChange={e => setForm(f => ({ ...f, contribution_frequency: e.target.value }))}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Creating...' : 'Create Stokvel'}</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : stokvels.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No stokvels yet</p>
              <p className="text-sm mt-1">Create your first stokvel to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stokvels.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 cursor-pointer group transition-all"
                >
                  <div>
                    <div className="font-semibold text-gray-800 group-hover:text-brand-700">{s.name}</div>
                    <div className="text-sm text-gray-500">
                      R{s.contribution_amount.toLocaleString('en-ZA')} / {s.contribution_frequency}
                      {s.description ? ` · ${s.description}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
