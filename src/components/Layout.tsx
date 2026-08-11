import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, PieChart, Settings, Plus, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

import { useLiveQuery } from 'dexie-react-hooks';
import { hasPendingMonthEndInstallments } from '../lib/receivables';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { path: '/charts', icon: PieChart, label: 'Gráficos' },
  { path: '/receivables', icon: Wallet, label: 'A Receber' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function Layout() {
  const showBadge = useLiveQuery(hasPendingMonthEndInstallments, []);
  const { pathname } = useLocation();
  const isReceivables = pathname.startsWith('/receivables');

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-surface dark:bg-bg-primary shadow-2xl relative overflow-hidden sm:border-x sm:border-border">
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar relative">
        <Outlet />
      </main>

      {!isReceivables && (
        <Link
          to="/add"
          className="absolute bottom-20 right-4 sm:right-6 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg text-accent-inverse hover:opacity-90 active:scale-95 transition-all z-50"
        >
          <Plus className="w-7 h-7" />
        </Link>
      )}

      <nav className="absolute bottom-0 w-full bg-bg-surface dark:bg-bg-primary/95 backdrop-blur-md border-t border-border pb-safe">
        <ul className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <li key={item.path} className="flex-1 h-full">
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  "relative flex flex-col items-center justify-center w-full h-full text-[10px] sm:text-xs font-medium gap-1 transition-all duration-200",
                  isActive
                    ? "text-accent scale-110"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <item.icon className={cn("w-5 h-5", "sm:w-6 sm:h-6")} />
                <span>{item.label}</span>
                {item.path === '/receivables' && showBadge && (
                  <span className="absolute top-1 right-4 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
