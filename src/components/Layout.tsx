import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, CalendarDays, PieChart, Settings, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { path: '/charts', icon: PieChart, label: 'Gráficos' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function Layout() {
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-slate-900 shadow-2xl relative overflow-hidden sm:border-x sm:border-slate-800">
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar relative">
        <Outlet />
      </main>
      
      {/* FAB para adicionar transação */}
      <Link 
        to="/add"
        className="absolute bottom-20 right-4 sm:right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50 text-white hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all z-50 border border-blue-400/20"
      >
        <Plus className="w-7 h-7" />
      </Link>
      
      <nav className="absolute bottom-0 w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe">
        <ul className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <li key={item.path} className="flex-1 h-full">
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center w-full h-full text-[10px] sm:text-xs font-medium gap-1 transition-all duration-200",
                  isActive 
                    ? "text-blue-500 scale-110" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <item.icon className={cn("w-5 h-5", "sm:w-6 sm:h-6")} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
