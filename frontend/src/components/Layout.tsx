import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Wallet, CalendarDays, Bell, ChevronDown, Trophy, AlertTriangle, BarChart3, Settings } from 'lucide-react';
import { Stokvel } from '../App';

interface LayoutProps {
  stokvel: Stokvel;
  onChangeStokvel: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/contributions', icon: Wallet, label: 'Contributions' },
  { to: '/payouts', icon: Trophy, label: 'Payouts' },
  { to: '/fines', icon: AlertTriangle, label: 'Fines' },
  { to: '/meetings', icon: CalendarDays, label: 'Meetings' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function Layout({ stokvel, onChangeStokvel }: LayoutProps) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-800 text-white flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="p-5 border-b border-brand-700">
          <div className="text-xs uppercase tracking-widest text-brand-300 mb-1">Stokvel Manager</div>
          <div className="font-bold text-lg text-white leading-tight">{stokvel.name}</div>
          <div className="text-brand-300 text-xs mt-0.5">
            R{stokvel.contribution_amount.toLocaleString('en-ZA')} / {stokvel.contribution_frequency}
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-3 space-y-1 border-t border-brand-700 pt-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-brand-200 hover:bg-brand-700 hover:text-white'
              }`
            }
          >
            <Settings size={17} /> Settings
          </NavLink>
          <button
            onClick={onChangeStokvel}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand-300 hover:text-white hover:bg-brand-700 rounded-lg transition-colors"
          >
            <ChevronDown size={16} /> Switch Stokvel
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
