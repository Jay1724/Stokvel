import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Clock, CheckSquare, Square } from 'lucide-react';
import { meetingApi } from '../api';
import { Stokvel } from '../App';
import { format, isPast } from 'date-fns';

interface Attendance { member_id: number; member_name: string; attended: number; }
interface Meeting {
  id: number;
  stokvel_id: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  status: string;
  created_at: string;
  attendance?: Attendance[];
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const emptyForm = {
  title: '',
  date: '',
  time: '',
  location: '',
  agenda: '',
  minutes: '',
  status: 'scheduled',
};

export default function Meetings({ stokvel }: { stokvel: Stokvel }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<Record<number, Meeting>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => meetingApi.list(stokvel.id).then(r => setMeetings(r.data));
  useEffect(() => { load(); }, [stokvel.id]);

  const loadDetails = async (id: number) => {
    const res = await meetingApi.get(stokvel.id, id);
    setMeetingDetails(prev => ({ ...prev, [id]: res.data }));
  };

  const toggleExpand = (id: number) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      loadDetails(id);
    }
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (m: Meeting) => {
    setEditing(m);
    setForm({ title: m.title, date: m.date, time: m.time || '', location: m.location || '', agenda: m.agenda || '', minutes: m.minutes || '', status: m.status });
    setError('');
    setShowForm(true);
    setExpanded(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.date) { setError('Title and date are required.'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await meetingApi.update(stokvel.id, editing.id, form);
      } else {
        await meetingApi.create(stokvel.id, form);
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
    if (!confirm('Delete this meeting?')) return;
    await meetingApi.delete(stokvel.id, id);
    setMeetings(prev => prev.filter(m => m.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const toggleAttendance = async (meetingId: number, memberId: number, current: number) => {
    const details = meetingDetails[meetingId];
    if (!details?.attendance) return;
    const newAttendance = details.attendance.map(a =>
      a.member_id === memberId ? { ...a, attended: current ? 0 : 1 } : a
    );
    setMeetingDetails(prev => ({ ...prev, [meetingId]: { ...details, attendance: newAttendance } }));
    await meetingApi.updateAttendance(stokvel.id, meetingId, [{ member_id: memberId, attended: !current }]);
  };

  const saveMinutes = async (meetingId: number, minutes: string) => {
    await meetingApi.update(stokvel.id, meetingId, {
      ...meetings.find(m => m.id === meetingId),
      minutes,
    });
    load();
  };

  const upcoming = meetings.filter(m => m.status === 'scheduled' && !isPast(new Date(m.date)));
  const past = meetings.filter(m => m.status !== 'scheduled' || isPast(new Date(m.date)));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{upcoming.length} upcoming · {past.length} past</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Schedule Meeting
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-brand-200">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Meeting' : 'Schedule Meeting'}</h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Meeting Title *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Monthly Meeting - May 2026" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Time</label>
              <input className="input" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location / Venue</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Thandi's house, 12 Oak St" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Agenda</label>
              <textarea className="input resize-none" rows={3} value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} placeholder="Meeting agenda items..." />
            </div>
            {editing && (
              <div className="sm:col-span-2">
                <label className="label">Minutes / Notes</label>
                <textarea className="input resize-none" rows={4} value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} placeholder="Record meeting minutes..." />
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Update Meeting' : 'Schedule Meeting'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {meetings.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">No meetings scheduled</p>
          <p className="text-sm mt-1">Schedule your first meeting to get started</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map(m => (
              <MeetingCard
                key={m.id}
                meeting={m}
                details={meetingDetails[m.id]}
                expanded={expanded === m.id}
                onToggle={() => toggleExpand(m.id)}
                onEdit={() => openEdit(m)}
                onDelete={() => handleDelete(m.id)}
                onToggleAttendance={toggleAttendance}
                onSaveMinutes={saveMinutes}
              />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Past Meetings</h2>
          <div className="space-y-3">
            {past.map(m => (
              <MeetingCard
                key={m.id}
                meeting={m}
                details={meetingDetails[m.id]}
                expanded={expanded === m.id}
                onToggle={() => toggleExpand(m.id)}
                onEdit={() => openEdit(m)}
                onDelete={() => handleDelete(m.id)}
                onToggleAttendance={toggleAttendance}
                onSaveMinutes={saveMinutes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingCard({ meeting, details, expanded, onToggle, onEdit, onDelete, onToggleAttendance, onSaveMinutes }: {
  meeting: Meeting;
  details?: Meeting;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAttendance: (meetingId: number, memberId: number, current: number) => void;
  onSaveMinutes: (meetingId: number, minutes: string) => void;
}) {
  const [minutesDraft, setMinutesDraft] = useState(meeting.minutes || '');

  useEffect(() => {
    if (details?.minutes !== undefined) setMinutesDraft(details.minutes || '');
  }, [details?.minutes]);

  const attendedCount = details?.attendance?.filter(a => a.attended).length ?? 0;
  const totalCount = details?.attendance?.length ?? 0;

  return (
    <div className="card p-0 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <div className="text-center bg-brand-50 rounded-lg px-3 py-2 flex-shrink-0">
            <div className="text-xs text-brand-600 font-medium">{format(new Date(meeting.date), 'MMM')}</div>
            <div className="text-xl font-bold text-brand-800 leading-none">{format(new Date(meeting.date), 'd')}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-800">{meeting.title}</div>
            <div className="flex items-center gap-3 mt-0.5">
              {meeting.time && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} /> {meeting.time}
                </span>
              )}
              {meeting.location && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={11} /> {meeting.location}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[meeting.status] || STATUS_COLORS.scheduled}`}>
                {meeting.status}
              </span>
              {details?.attendance && (
                <span className="text-xs text-gray-400">{attendedCount}/{totalCount} attended</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <Pencil size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {meeting.agenda && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agenda</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.agenda}</p>
            </div>
          )}

          {details?.attendance && details.attendance.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Attendance ({attendedCount}/{totalCount})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {details.attendance.map(a => (
                  <button
                    key={a.member_id}
                    onClick={() => onToggleAttendance(meeting.id, a.member_id, a.attended)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                      a.attended
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {a.attended ? <CheckSquare size={15} className="text-green-500" /> : <Square size={15} className="text-gray-300" />}
                    {a.member_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Meeting Minutes</h3>
            <textarea
              className="input resize-none text-sm"
              rows={4}
              placeholder="Record meeting minutes and decisions..."
              value={minutesDraft}
              onChange={e => setMinutesDraft(e.target.value)}
            />
            <button
              className="btn-primary text-sm mt-2"
              onClick={() => onSaveMinutes(meeting.id, minutesDraft)}
            >
              Save Minutes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
