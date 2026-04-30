import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function BlockDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const block = useLiveQuery(() => id ? db.blocks.get(id) : undefined, [id]);
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const transactions = useLiveQuery(
    () => id ? db.transactions.where({ blockId: id }).toArray() : [],
    [id]
  ) || [];

  if (!block) return <div className="p-6 text-slate-400 flex items-center justify-center h-full">Carregando bloco...</div>;

  const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'completed');
  const spent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = block.totalAmount - spent;
  const percent = Math.min((spent / block.totalAmount) * 100, 100);

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-slate-900 shadow-2xl sm:border-x sm:border-slate-800">
      <header className="p-4 flex items-center gap-4 bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 border-b border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-300 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-50">{block.name}</h1>
          <p className="text-xs text-slate-400">Orçamento {block.period === 'monthly' ? 'Mensal' : 'Semanal'}</p>
        </div>
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24 space-y-6">
        <section className="bg-slate-800/80 p-6 rounded-3xl shadow-lg border border-slate-700/50 backdrop-blur-sm">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Gasto</p>
              <p className="text-2xl font-bold text-slate-100">R$ {spent.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Restante</p>
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                R$ {remaining.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-center text-xs text-slate-500 mt-3 font-medium">Orçamento Total: R$ {block.totalAmount.toFixed(2)}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Transações do Bloco</h2>
          {transactions.length === 0 ? (
            <div className="text-center p-8 bg-slate-800/30 rounded-3xl border border-slate-700 border-dashed">
              <p className="text-slate-400 text-sm">Nenhuma transação registrada neste bloco.</p>
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
                    className="bg-slate-800/60 p-4 rounded-3xl border border-slate-700/50 flex justify-between items-center shadow-md backdrop-blur-sm transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
                      <div>
                        <p className="text-slate-200 text-sm font-semibold flex items-center gap-2">
                          {t.description || cat?.name || 'Transação'}
                          {t.status === 'planned' && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
                              Planejado
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{cat?.name} • {format(new Date(t.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <p className={cn("font-bold text-base", t.type === 'income' ? 'text-emerald-400' : 'text-red-400')}>
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
