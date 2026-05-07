import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Send, Trash2, Shield, MessageSquare } from 'lucide-react';
import { settingsApi } from '../api';
import { useAuth } from '../context/AuthContext';

interface SettingsData {
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_from_number?: string;
  twilio_channel?: string;
  twilio_configured?: string;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<SettingsData>({});
  const [form, setForm] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_from_number: '',
    twilio_channel: 'sms',
  });
  const [testPhone, setTestPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState('');

  const load = () => settingsApi.get().then(r => setSettings(r.data));
  useEffect(() => { load(); }, []);

  const isConfigured = settings.twilio_configured === 'true';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    const data: Record<string, string> = {};
    if (form.twilio_account_sid) data.twilio_account_sid = form.twilio_account_sid;
    if (form.twilio_auth_token) data.twilio_auth_token = form.twilio_auth_token;
    if (form.twilio_from_number) data.twilio_from_number = form.twilio_from_number;
    data.twilio_channel = form.twilio_channel;

    setSaving(true);
    try {
      const res = await settingsApi.update(data);
      setMessage(res.data.configured ? 'Twilio configured successfully.' : 'Settings saved. Provide all credentials to enable notifications.');
      setForm({ twilio_account_sid: '', twilio_auth_token: '', twilio_from_number: '', twilio_channel: form.twilio_channel });
      load();
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove Twilio configuration? This will disable WhatsApp/SMS notifications.')) return;
    await settingsApi.deleteTwilio();
    setMessage('Twilio configuration removed.');
    load();
  };

  const handleTest = async () => {
    if (!testPhone) { setTestResult('Enter a phone number to test.'); return; }
    setTesting(true); setTestResult('');
    try {
      const res = await settingsApi.testNotification(testPhone);
      if (res.data.success) {
        setTestResult(`Test message sent successfully via ${res.data.channel}.`);
      } else {
        setTestResult(`Send failed: ${res.data.error}`);
      }
    } catch (err: any) {
      setTestResult(err.response?.data?.error || 'Failed to send test message.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your account and notification configuration</p>

      {/* Account */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield size={17} className="text-brand-600" /> Account
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-700">{user?.name}</div>
            <div className="text-sm text-gray-400">{user?.email}</div>
          </div>
          <button onClick={logout} className="btn-secondary text-sm">Sign out</button>
        </div>
      </div>

      {/* WhatsApp / SMS */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <MessageSquare size={17} className="text-brand-600" /> WhatsApp / SMS Notifications
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure Twilio to send payment and meeting reminders directly to members via SMS or WhatsApp.
          Get credentials at{' '}
          <span className="font-medium text-brand-600">twilio.com</span>.
        </p>

        <div className={`flex items-center gap-2 mb-5 p-3 rounded-lg ${isConfigured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          {isConfigured
            ? <CheckCircle size={16} className="text-green-600" />
            : <XCircle size={16} className="text-yellow-600" />
          }
          <span className={`text-sm font-medium ${isConfigured ? 'text-green-700' : 'text-yellow-700'}`}>
            {isConfigured ? 'Twilio is configured and active' : 'Twilio is not configured — notifications are disabled'}
          </span>
          {isConfigured && (
            <span className="ml-auto text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {settings.twilio_channel || 'sms'}
            </span>
          )}
        </div>

        {message && <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-lg text-sm text-brand-700">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Channel</label>
              <select className="input" value={form.twilio_channel} onChange={e => setForm(f => ({ ...f, twilio_channel: e.target.value }))}>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="label">From Number</label>
              <input className="input" value={form.twilio_from_number} onChange={e => setForm(f => ({ ...f, twilio_from_number: e.target.value }))} placeholder="+14155238886" />
              <p className="text-xs text-gray-400 mt-1">For WhatsApp sandbox: +14155238886</p>
            </div>
          </div>
          <div>
            <label className="label">Account SID</label>
            <input className="input" value={form.twilio_account_sid} onChange={e => setForm(f => ({ ...f, twilio_account_sid: e.target.value }))} placeholder={isConfigured ? '(already set — leave blank to keep)' : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'} />
          </div>
          <div>
            <label className="label">Auth Token</label>
            <input className="input" type="password" value={form.twilio_auth_token} onChange={e => setForm(f => ({ ...f, twilio_auth_token: e.target.value }))} placeholder={isConfigured ? '(already set — leave blank to keep)' : 'Your Twilio auth token'} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</button>
            {isConfigured && (
              <button type="button" onClick={handleRemove} className="btn-secondary flex items-center gap-2 text-sm text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </form>

        {isConfigured && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Send size={14} className="text-brand-600" /> Send Test Message
            </h3>
            <div className="flex gap-3">
              <input
                className="input flex-1"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="+27 82 123 4567"
              />
              <button onClick={handleTest} disabled={testing} className="btn-primary text-sm whitespace-nowrap">
                {testing ? 'Sending...' : 'Send Test'}
              </button>
            </div>
            {testResult && (
              <p className={`mt-2 text-sm ${testResult.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {testResult}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
