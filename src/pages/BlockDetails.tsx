import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMonthStore } from '../store/monthStore';

export function BlockDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const monthParam = params.get('month');

  const storeDate = useMonthStore((s) => s.currentDate);
  const setStoreDate = useMonthStore((s) => s.setCurrentDate);

  useEffect(() => {
    if (monthParam) {
      setStoreDate(parseISO(`${monthParam}-01`));
    }
  }, [monthParam, setStoreDate]);

  const targetDate = monthParam ? parseISO(`${monthParam}-01`) : storeDate;
  const start = format(startOfMonth(targetDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(targetDate), 'yyyy-MM-dd');

  const block = useLiveQuery(() => id ? db.blocks.get(id) : undefined, [id]);
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const transactions = useLiveQuery(
    async () => {
      if (!id) return [];
      return await db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter(t => t.blockId === id)
        .toArray();
    },
    [id, start, end]
  ) || [];

  if (!block) return <div className="p-6 text-text-secondary flex items-center justify-center h-full">Carregando bloco...</div>;

  const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'completed');
  const spent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = block.totalAmount - spent;
  const percent = Math.min((spent / block.totalAmount) * 100, 100);

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center gap-4 bg-bg-primary sticky top-0 z-10 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{block.name}</h1>
          <p className="text-xs text-text-secondary capitalize">
            {format(targetDate, 'MMMM yyyy', { locale: ptBR })} • Orçamento {block.period === 'monthly' ? 'Mensal' : 'Semanal'}
          </p>
        </div>
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24 space-y-6">
        <section className="bg-bg-elevated p-6 rounded-3xl shadow-lg border border-border">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">Gasto</p>
              <p className="text-2xl font-bold text-text-primary">R$ {spent.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">Restante</p>
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                R$ {remaining.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="h-3 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${percent > 90 ? 'bg-danger' : percent > 75 ? 'bg-yellow-500' : 'bg-accent'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-center text-xs text-text-secondary mt-3 font-medium">Orçamento Total: R$ {block.totalAmount.toFixed(2)}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Transações do Bloco</h2>
          {transactions.length === 0 ? (
            <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
              <p className="text-text-secondary text-sm">Nenhuma transação registrada neste bloco.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
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
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
                              Planejado
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">{cat?.name} • {format(new Date(t.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <p className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
