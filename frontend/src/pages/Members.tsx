import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, UserCheck, UserX, Search } from 'lucide-react';
import { memberApi } from '../api';
import { Stokvel } from '../App';
import { format } from 'date-fns';

interface Member {
  id: number;
  stokvel_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  join_date: string;
  active: number;
}

const ROLES = ['member', 'chairperson', 'secretary', 'treasurer'];
const ROLE_COLORS: Record<string, string> = {
  chairperson: 'bg-purple-100 text-purple-700',
  secretary: 'bg-blue-100 text-blue-700',
  treasurer: 'bg-yellow-100 text-yellow-700',
  member: 'bg-gray-100 text-gray-600',
};

const emptyForm = { name: '', phone: '', email: '', role: 'member', join_date: new Date().toISOString().split('T')[0] };

export default function Members({ stokvel }: { stokvel: Stokvel }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => memberApi.list(stokvel.id).then(r => setMembers(r.data));
  useEffect(() => { load(); }, [stokvel.id]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone || '', email: m.email || '', role: m.role, join_date: m.join_date });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Name is required.'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await memberApi.update(stokvel.id, editing.id, { ...form, active: editing.active });
      } else {
        await memberApi.create(stokvel.id, form);
      }
      await load();
      setShowForm(false);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this member? Their contribution history will also be deleted.')) return;
    await memberApi.delete(stokvel.id, id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const toggleActive = async (m: Member) => {
    await memberApi.update(stokvel.id, m.id, { ...m, active: m.active ? 0 : 1 });
    load();
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone && m.phone.includes(search)) ||
    (m.email && m.email.toLowerCase().includes(search.toLowerCase()))
  );

  const active = filtered.filter(m => m.active);
  const inactive = filtered.filter(m => !m.active);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 text-sm mt-0.5">{members.filter(m => m.active).length} active · {members.filter(m => !m.active).length} inactive</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-6 border-brand-200">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Member' : 'Add New Member'}</h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Thandi Dlamini" />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+27 82 123 4567" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="thandi@example.com" />
            </div>
            <div>
              <label className="label">Join Date</label>
              <input className="input" type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Update Member' : 'Add Member'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Active members */}
      {active.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-medium text-gray-700 mb-3">Active Members ({active.length})</h2>
          <div className="divide-y divide-gray-50">
            {active.map(m => (
              <MemberRow key={m.id} member={m} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive members */}
      {inactive.length > 0 && (
        <div className="card opacity-75">
          <h2 className="font-medium text-gray-500 mb-3">Inactive Members ({inactive.length})</h2>
          <div className="divide-y divide-gray-50">
            {inactive.map(m => (
              <MemberRow key={m.id} member={m} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">{search ? 'No members match your search' : 'No members yet'}</p>
          {!search && <p className="text-sm mt-1">Add your first member to get started</p>}
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, onEdit, onDelete, onToggle }: {
  member: Member;
  onEdit: (m: Member) => void;
  onDelete: (id: number) => void;
  onToggle: (m: Member) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 text-sm">{member.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
              {member.role}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {member.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Phone size={11} /> {member.phone}
              </span>
            )}
            {member.email && (
              <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                <Mail size={11} /> {member.email}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Member since {format(new Date(member.join_date), 'd MMM yyyy')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
        <button
          onClick={() => onToggle(member)}
          title={member.active ? 'Deactivate' : 'Activate'}
          className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        >
          {member.active ? <UserX size={15} /> : <UserCheck size={15} />}
        </button>
        <button
          onClick={() => onEdit(member)}
          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => onDelete(member.id)}
          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
