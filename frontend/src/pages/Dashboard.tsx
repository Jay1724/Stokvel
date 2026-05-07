import { useState, useEffect } from 'react';
import { Users, Wallet, CalendarDays, Bell, TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { stokvelApi, contributionApi } from '../api';
import { Stokvel } from '../App';
import { format } from 'date-fns';

interface Stats {
  totalMembers: number;
  totalContributions: number;
  paidThisMonth: number;
  upcomingMeetings: number;
  pendingReminders: number;
}

interface PaymentStatus {
  member: { id: number; name: string };
  contribution: any | null;
  paid: boolean;
}

export default function Dashboard({ stokvel }: { stokvel: Stokvel }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus[]>([]);
  const now = new Date();

  useEffect(() => {
    stokvelApi.stats(stokvel.id).then(r => setStats(r.data));
    contributionApi
      .status(stokvel.id, now.getFullYear(), now.getMonth() + 1)
      .then(r => setPaymentStatus(r.data));
  }, [stokvel.id]);

  const statCards = stats
    ? [
        {
          label: 'Active Members',
          value: stats.totalMembers,
          icon: Users,
          color: 'bg-blue-50 text-blue-600',
          iconColor: 'text-blue-500',
        },
        {
          label: 'Total Contributions',
          value: `R${stats.totalContributions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          icon: TrendingUp,
          color: 'bg-brand-50 text-brand-600',
          iconColor: 'text-brand-500',
        },
        {
          label: 'Paid This Month',
          value: `${stats.paidThisMonth} / ${stats.totalMembers}`,
          icon: Wallet,
          color: 'bg-yellow-50 text-yellow-600',
          iconColor: 'text-yellow-500',
        },
        {
          label: 'Upcoming Meetings',
          value: stats.upcomingMeetings,
          icon: CalendarDays,
          color: 'bg-purple-50 text-purple-600',
          iconColor: 'text-purple-500',
        },
        {
          label: 'Pending Reminders',
          value: stats.pendingReminders,
          icon: Bell,
          color: 'bg-red-50 text-red-600',
          iconColor: 'text-red-500',
        },
      ]
    : [];

  const paidCount = paymentStatus.filter(p => p.paid).length;
  const unpaidCount = paymentStatus.filter(p => !p.paid).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{stokvel.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {format(now, 'EEEE, d MMMM yyyy')} · R{stokvel.contribution_amount.toLocaleString('en-ZA')} per {stokvel.contribution_frequency}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className="card">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
              <Icon size={20} className={iconColor} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Payment status this month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-brand-600" />
            Payment Status — {format(now, 'MMMM yyyy')}
          </h2>

          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" />
              <span className="font-medium text-green-700">{paidCount} paid</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={16} className="text-red-400" />
              <span className="font-medium text-red-600">{unpaidCount} outstanding</span>
            </div>
          </div>

          {paymentStatus.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {paymentStatus.map(({ member, paid, contribution }) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{member.name}</span>
                  <div className="flex items-center gap-2">
                    {paid ? (
                      <>
                        <span className="text-xs text-gray-400">
                          R{contribution.amount.toLocaleString('en-ZA')}
                        </span>
                        <span className="badge-paid">Paid</span>
                      </>
                    ) : (
                      <span className="badge-overdue">Outstanding</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-brand-600" />
            Monthly Collection Progress
          </h2>
          {stats && stats.totalMembers > 0 ? (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>{paidCount} of {stats.totalMembers} members paid</span>
                  <span>{Math.round((paidCount / stats.totalMembers) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-brand-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(paidCount / stats.totalMembers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-brand-50 rounded-lg">
                <div className="text-sm text-brand-700 font-medium">Expected this month</div>
                <div className="text-2xl font-bold text-brand-800 mt-1">
                  R{(stats.totalMembers * stokvel.contribution_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-brand-600 mt-0.5">
                  R{(paidCount * stokvel.contribution_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} collected so far
                </div>
              </div>

              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-700 font-medium">Still outstanding</div>
                <div className="text-2xl font-bold text-red-800 mt-1">
                  R{(unpaidCount * stokvel.contribution_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Add members to start tracking</p>
          )}
        </div>
      </div>
    </div>
  );
}
