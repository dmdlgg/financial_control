import { useEffect, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { cn, formatCurrencyInput } from '../lib/utils';
import { useMonthStore } from '../store/monthStore';

export function CalendarView() {
  const navigate = useNavigate();
  const currentDate = useMonthStore((s) => s.currentDate);
  const goToPreviousMonth = useMonthStore((s) => s.goToPreviousMonth);
  const goToNextMonth = useMonthStore((s) => s.goToNextMonth);

  const [selectedDate, setSelectedDate] = useState(currentDate);

  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

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
  const totalGastoDia = selectedTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <header className="p-4 sm:p-6 pb-2">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Calendário</h1>

        <div className="flex items-center justify-between mb-4 bg-bg-elevated p-2 rounded-2xl border border-border">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-text-primary capitalize tracking-wide">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={goToNextMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-6 flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider py-1">
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
                key={dateStr}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={handleDoubleClick}
                className={cn(
                  "aspect-square flex flex-col items-center justify-start p-1.5 sm:p-2 rounded-2xl border transition-all duration-200",
                  !isCurrentMonth ? "text-text-secondary border-transparent bg-transparent" : cn("bg-bg-elevated border-border text-text-primary", !isSelected && "hover:bg-bg-surface"),
                  isSelected && "border-4 border-accent bg-accent text-accent-inverse font-bold",
                  isSameDay(day, new Date()) && !isSelected && "border-border font-bold text-text-primary"
                )}
              >
                <span className="text-xs sm:text-sm">{format(day, 'd')}</span>
                <div className="flex gap-1 mt-1.5">
                  {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                  {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-danger" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pb-24">
          <h3 className="text-sm font-semibold text-text-primary mb-4 capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">Total gasto no dia:</span>
            <span className="text-sm font-semibold text-danger">{formatCurrencyInput(Math.round(totalGastoDia * 100).toString())}</span>
          </div>
          {selectedTransactions.length === 0 ? (
            <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
              <p className="text-text-secondary text-sm">Nenhuma transação neste dia.</p>
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
                      className="bg-bg-elevated p-4 rounded-3xl border border-border flex justify-between items-center shadow-md transition-transform hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <p className="text-text-primary text-sm font-semibold flex items-center gap-2">
                            {t.description || cat?.name || 'Transação'}
                            {t.status === 'planned' && (
                              <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-600">
                                Planejado
                              </span>
                            )}
                          </p>
                          {t.description && cat?.name && <p className="text-xs text-text-secondary mt-0.5">{cat.name}</p>}
                        </div>
                      </div>
                      <p className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrencyInput(Math.round(t.amount * 100).toString())}
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
