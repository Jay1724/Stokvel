import { useState, useEffect, useCallback } from 'react';
import { Download, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { reportApi } from '../api';
import { Stokvel } from '../App';

interface MemberBreakdown {
  member: { id: number; name: string };
  paid: boolean;
  contribution: { amount: number; payment_date: string } | null;
  payout: { amount: number } | null;
  fines: { amount: number; reason: string; status: string }[];
  finesTotal: number;
}

interface MonthlyReport {
  stokvel: any;
  period: { year: number; month: number; label: string };
  summary: {
    totalContributions: number;
    totalPayouts: number;
    totalFinesPaid: number;
    totalFinesIssued: number;
    netInflow: number;
    paidCount: number;
    unpaidCount: number;
    memberCount: number;
  };
  allTime: { totalContributions: number; totalPayouts: number; balance: number; finesOutstanding: number };
  memberBreakdown: MemberBreakdown[];
}

interface AnnualMonth { month: number; label: string; totalContrib: number; totalPayout: number; finesIssued: number; }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function exportCSV(report: MonthlyReport) {
  const rows = [
    ['Member', 'Contribution Paid', 'Amount (R)', 'Payment Date', 'Payout (R)', 'Fines Issued (R)', 'Net'],
    ...report.memberBreakdown.map(mb => [
      mb.member.name,
      mb.paid ? 'Yes' : 'No',
      mb.contribution ? mb.contribution.amount.toFixed(2) : '0.00',
      mb.contribution ? mb.contribution.payment_date : '',
      mb.payout ? mb.payout.amount.toFixed(2) : '0.00',
      mb.finesTotal.toFixed(2),
      ((mb.contribution?.amount || 0) - (mb.payout?.amount || 0) - mb.finesTotal).toFixed(2),
    ]),
    [],
    ['SUMMARY'],
    ['Total Contributions', report.summary.totalContributions.toFixed(2)],
    ['Total Payouts', report.summary.totalPayouts.toFixed(2)],
    ['Total Fines Issued', report.summary.totalFinesIssued.toFixed(2)],
    ['Net Inflow', report.summary.netInflow.toFixed(2)],
    ['Members Paid', `${report.summary.paidCount} / ${report.summary.memberCount}`],
  ];

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.stokvel.name} - ${report.period.label} Report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAnnualCSV(annual: { year: number; months: AnnualMonth[]; grandTotalContrib: number; grandTotalPayout: number }, stokvelName: string) {
  const rows = [
    ['Month', 'Contributions (R)', 'Payouts (R)', 'Fines Issued (R)', 'Net (R)'],
    ...annual.months.map(m => [
      m.label,
      m.totalContrib.toFixed(2),
      m.totalPayout.toFixed(2),
      m.finesIssued.toFixed(2),
      (m.totalContrib - m.totalPayout).toFixed(2),
    ]),
    [],
    ['TOTAL', annual.grandTotalContrib.toFixed(2), annual.grandTotalPayout.toFixed(2), '', (annual.grandTotalContrib - annual.grandTotalPayout).toFixed(2)],
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${stokvelName} - ${annual.year} Annual Report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports({ stokvel }: { stokvel: Stokvel }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual'>('monthly');
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [annual, setAnnual] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadMonthly = useCallback(() => {
    setLoading(true);
    reportApi.monthly(stokvel.id, year, month)
      .then(r => setMonthly(r.data))
      .finally(() => setLoading(false));
  }, [stokvel.id, year, month]);

  const loadAnnual = useCallback(() => {
    setLoading(true);
    reportApi.annual(stokvel.id, year)
      .then(r => setAnnual(r.data))
      .finally(() => setLoading(false));
  }, [stokvel.id, year]);

  useEffect(() => { if (activeTab === 'monthly') loadMonthly(); }, [activeTab, loadMonthly]);
  useEffect(() => { if (activeTab === 'annual') loadAnnual(); }, [activeTab, loadAnnual]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Financial summaries and exports</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'monthly' && monthly && (
            <button onClick={() => exportCSV(monthly)} className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={15} /> Export CSV
            </button>
          )}
          {activeTab === 'annual' && annual && (
            <button onClick={() => exportAnnualCSV(annual, stokvel.name)} className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={15} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {(['monthly', 'annual'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'monthly' ? 'Monthly Report' : 'Annual Summary'}
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <h2 className="font-semibold text-gray-800 text-lg min-w-[160px] text-center">{MONTHS[month - 1]} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading report...</div>
          ) : monthly ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Contributions', value: `R${monthly.summary.totalContributions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, color: 'bg-brand-50 text-brand-700' },
                  { label: 'Payouts', value: `R${monthly.summary.totalPayouts.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, color: 'bg-purple-50 text-purple-700' },
                  { label: 'Fines Issued', value: `R${monthly.summary.totalFinesIssued.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, color: 'bg-red-50 text-red-700' },
                  { label: 'Net Inflow', value: `R${monthly.summary.netInflow.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, color: 'bg-green-50 text-green-700' },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
                    <div className="text-xl font-bold">{c.value}</div>
                    <div className="text-xs mt-0.5 opacity-80">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* All-time balance */}
              <div className="card mb-6 bg-brand-800 text-white border-0">
                <div className="text-brand-200 text-sm mb-1">All-time balance</div>
                <div className="text-3xl font-bold">R{monthly.allTime.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                <div className="flex gap-6 mt-2 text-sm text-brand-300">
                  <span>Collected: R{monthly.allTime.totalContributions.toLocaleString('en-ZA')}</span>
                  <span>Paid out: R{monthly.allTime.totalPayouts.toLocaleString('en-ZA')}</span>
                  {monthly.allTime.finesOutstanding > 0 && (
                    <span className="text-yellow-300">Fines owed: R{monthly.allTime.finesOutstanding.toLocaleString('en-ZA')}</span>
                  )}
                </div>
              </div>

              {/* Per-member breakdown */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Member Breakdown — {monthly.period.label}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-3 pr-4">Member</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4 text-right">Contribution</th>
                        <th className="pb-3 pr-4 text-right">Payout</th>
                        <th className="pb-3 text-right">Fines</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {monthly.memberBreakdown.map(mb => (
                        <tr key={mb.member.id}>
                          <td className="py-3 pr-4 font-medium text-gray-700">{mb.member.name}</td>
                          <td className="py-3 pr-4">
                            <span className={mb.paid ? 'badge-paid' : 'badge-overdue'}>
                              {mb.paid ? 'Paid' : 'Outstanding'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right text-gray-600">
                            {mb.contribution ? `R${mb.contribution.amount.toLocaleString('en-ZA')}` : '—'}
                          </td>
                          <td className="py-3 pr-4 text-right text-purple-600">
                            {mb.payout ? `R${mb.payout.amount.toLocaleString('en-ZA')}` : '—'}
                          </td>
                          <td className="py-3 text-right text-red-600">
                            {mb.finesTotal > 0 ? `R${mb.finesTotal.toLocaleString('en-ZA')}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-semibold">
                        <td className="pt-3 pr-4" colSpan={2}>Totals</td>
                        <td className="pt-3 pr-4 text-right text-brand-700">R{monthly.summary.totalContributions.toLocaleString('en-ZA')}</td>
                        <td className="pt-3 pr-4 text-right text-purple-700">R{monthly.summary.totalPayouts.toLocaleString('en-ZA')}</td>
                        <td className="pt-3 text-right text-red-700">R{monthly.summary.totalFinesIssued.toLocaleString('en-ZA')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}

      {activeTab === 'annual' && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <h2 className="font-semibold text-gray-800 text-lg min-w-[80px] text-center">{year}</h2>
            <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading report...</div>
          ) : annual ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-brand-700">R{annual.grandTotalContrib.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Contributions</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-purple-700">R{annual.grandTotalPayout.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Payouts</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-green-700">R{(annual.grandTotalContrib - annual.grandTotalPayout).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-gray-500 mt-1">Net Balance</div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 size={17} className="text-brand-600" /> Monthly Breakdown — {year}
                </h3>

                {/* Visual bar chart */}
                <div className="mb-6">
                  {annual.months.map((m: AnnualMonth) => {
                    const maxVal = Math.max(...annual.months.map((x: AnnualMonth) => x.totalContrib), 1);
                    const pct = (m.totalContrib / maxVal) * 100;
                    return (
                      <div key={m.month} className="flex items-center gap-3 mb-2">
                        <div className="text-xs text-gray-500 w-8 text-right">{m.label.slice(0, 3)}</div>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                          <div className="h-full bg-brand-500 rounded transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-gray-600 w-24 text-right">
                          {m.totalContrib > 0 ? `R${m.totalContrib.toLocaleString('en-ZA')}` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-3 pr-4">Month</th>
                      <th className="pb-3 pr-4 text-right">Contributions</th>
                      <th className="pb-3 pr-4 text-right">Payouts</th>
                      <th className="pb-3 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {annual.months.map((m: AnnualMonth) => (
                      <tr key={m.month} className={m.totalContrib === 0 ? 'opacity-40' : ''}>
                        <td className="py-2.5 pr-4 text-gray-700">{m.label}</td>
                        <td className="py-2.5 pr-4 text-right text-brand-700">{m.totalContrib > 0 ? `R${m.totalContrib.toLocaleString('en-ZA')}` : '—'}</td>
                        <td className="py-2.5 pr-4 text-right text-purple-600">{m.totalPayout > 0 ? `R${m.totalPayout.toLocaleString('en-ZA')}` : '—'}</td>
                        <td className="py-2.5 text-right text-gray-600">{m.totalContrib > 0 ? `R${(m.totalContrib - m.totalPayout).toLocaleString('en-ZA')}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-semibold">
                      <td className="pt-3 pr-4 text-gray-700">Total</td>
                      <td className="pt-3 pr-4 text-right text-brand-700">R{annual.grandTotalContrib.toLocaleString('en-ZA')}</td>
                      <td className="pt-3 pr-4 text-right text-purple-700">R{annual.grandTotalPayout.toLocaleString('en-ZA')}</td>
                      <td className="pt-3 text-right text-green-700">R{(annual.grandTotalContrib - annual.grandTotalPayout).toLocaleString('en-ZA')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
