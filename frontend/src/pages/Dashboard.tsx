import { useState, useEffect } from 'react';
import { Users, Wallet, CalendarDays, Bell, TrendingUp, CheckCircle, AlertCircle, Trophy, AlertTriangle } from 'lucide-react';
import { stokvelApi, contributionApi } from '../api';
import { Stokvel } from '../App';
import { format } from 'date-fns';

interface Stats {
  totalMembers: number;
  totalContributions: number;
  totalPayouts: number;
  totalFinesOutstanding: number;
  balance: number;
  paidThisMonth: number;
  upcomingMeetings: number;
  pendingReminders: number;
  nextPayoutMember: { id: number; name: string } | null;
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

  const paidCount = paymentStatus.filter(p => p.paid).length;
  const unpaidCount = paymentStatus.filter(p => !p.paid).length;

  const statCards = stats ? [
    { label: 'Active Members', value: stats.totalMembers, icon: Users, bg: 'bg-blue-50', iconColor: 'text-blue-500' },
    { label: 'Fund Balance', value: `R${stats.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, icon: TrendingUp, bg: 'bg-brand-50', iconColor: 'text-brand-500' },
    { label: 'Paid This Month', value: `${stats.paidThisMonth} / ${stats.totalMembers}`, icon: Wallet, bg: 'bg-yellow-50', iconColor: 'text-yellow-500' },
    { label: 'Upcoming Meetings', value: stats.upcomingMeetings, icon: CalendarDays, bg: 'bg-purple-50', iconColor: 'text-purple-500' },
    { label: 'Pending Reminders', value: stats.pendingReminders, icon: Bell, bg: 'bg-red-50', iconColor: 'text-red-500' },
    { label: 'Fines Outstanding', value: `R${stats.totalFinesOutstanding.toLocaleString('en-ZA')}`, icon: AlertTriangle, bg: 'bg-orange-50', iconColor: 'text-orange-500' },
  ] : [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{stokvel.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {format(now, 'EEEE, d MMMM yyyy')} · R{stokvel.contribution_amount.toLocaleString('en-ZA')} per {stokvel.contribution_frequency}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, bg, iconColor }) => (
          <div key={label} className="card">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon size={20} className={iconColor} />
            </div>
            <div className="text-xl font-bold text-gray-800 leading-tight">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Next payout banner */}
      {stats?.nextPayoutMember && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
          <Trophy size={22} className="text-yellow-500 flex-shrink-0" />
          <div>
            <div className="font-semibold text-yellow-800">Next payout recipient</div>
            <div className="text-yellow-700 text-sm">{stats.nextPayoutMember.name} is next in the rotation</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment status */}
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
                        <span className="text-xs text-gray-400">R{contribution.amount.toLocaleString('en-ZA')}</span>
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

        {/* Collection progress */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-600" /> Monthly Collection
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
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-brand-50 rounded-lg">
                  <div className="text-lg font-bold text-brand-800">
                    R{(paidCount * stokvel.contribution_amount).toLocaleString('en-ZA')}
                  </div>
                  <div className="text-xs text-brand-600 mt-0.5">Collected so far</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-800">
                    R{(unpaidCount * stokvel.contribution_amount).toLocaleString('en-ZA')}
                  </div>
                  <div className="text-xs text-red-600 mt-0.5">Still outstanding</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-800">
                    R{stats.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-green-600 mt-0.5">Fund balance (all time)</div>
                </div>
                {stats.totalFinesOutstanding > 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-800">
                      R{stats.totalFinesOutstanding.toLocaleString('en-ZA')}
                    </div>
                    <div className="text-xs text-orange-600 mt-0.5">Fines outstanding</div>
                  </div>
                )}
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
