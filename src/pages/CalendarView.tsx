import { useState } from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { cn } from '../lib/utils';

export function CalendarView() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });
  
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  
  const transactions = useLiveQuery(
    () => db.transactions
      .where('date')
      .between(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), true, true)
      .toArray(),
    [startDate.toISOString(), endDate.toISOString()]
  ) || [];

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTransactions = transactions.filter(t => t.date === selectedDateStr);
  // Soma dos gastos (apenas despesas) do dia selecionado
  const totalGastoDia = selectedTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <header className="p-4 sm:p-6 pb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">Calendário</h1>
        
        <div className="flex items-center justify-between mb-4 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize tracking-wide">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-6 flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTrans = transactions.filter(t => t.date === dateStr);
            const hasIncome = dayTrans.some(t => t.type === 'income');
            const hasExpense = dayTrans.some(t => t.type === 'expense');
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);

            const handleDoubleClick = () => {
              navigate(`/add?date=${dateStr}`);
            };

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={handleDoubleClick}
                className={cn(
                  "aspect-square flex flex-col items-center justify-start p-1.5 sm:p-2 rounded-2xl border transition-all duration-200",
                  !isCurrentMonth ? "text-slate-600 border-transparent bg-transparent" : "bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/60",
                  isSelected && "border-4 border-blue-900 bg-blue-500 text-white font-bold shadow-[0_0_24px_rgba(30,58,138,0.45)]",
                  isSameDay(day, new Date()) && !isSelected && "border-slate-500 font-bold text-slate-900 dark:text-slate-100"
                )}
              >
                <span className="text-xs sm:text-sm">{format(day, 'd')}</span>
                <div className="flex gap-1 mt-1.5">
                  {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />}
                  {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Details */}
        <div className="mt-8 pb-24">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          {/* Total gasto no dia */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total gasto no dia:</span>
            <span className="text-sm font-semibold text-red-500">R$ {totalGastoDia.toFixed(2)}</span>
          </div>
          {selectedTransactions.length === 0 ? (
            <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
              <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm">Nenhuma transação neste dia.</p>
            </div>
          ) : (
            <div className="pb-4">
              <ul className="space-y-3">
                {selectedTransactions.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const color = cat?.color || (t.type === 'income' ? '#10b981' : '#ef4444');
                  return (
                  <li 
                    key={t.id} 
                    onClick={() => navigate(`/edit/${t.id}`)}
                    className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex justify-between items-center shadow-md backdrop-blur-sm transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
                      <div>
                        <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2">
                          {t.description || cat?.name || 'Transação'}
                          {t.status === 'planned' && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
                              Planejado
                            </span>
                          )}
                        </p>
                        {t.description && cat?.name && <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">{cat.name}</p>}
                      </div>
                    </div>
                    <p className={cn("font-bold text-base", t.type === 'income' ? 'text-emerald-400' : 'text-red-400')}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </p>
                  </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
