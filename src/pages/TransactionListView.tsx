import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../db';
import { format, parseISO, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

export function TransactionListView() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const type = params.get('type') === 'income' ? 'income' : 'expense';

  const monthParam = params.get('month'); // Expecting YYYY-MM
  
  const transactions = useLiveQuery(async () => {
    let query = db.transactions.where('type').equals(type);
    
    if (monthParam) {
      const start = `${monthParam}-01`;
      const dateObj = parseISO(start);
      const end = format(endOfMonth(dateObj), 'yyyy-MM-dd');
      return await db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter(t => t.type === type)
        .toArray();
    }
    
    return await query.toArray();
  }, [type, monthParam]) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];

  // Agrupar por data
  const grouped = transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((acc, t) => {
      (acc[t.date] = acc[t.date] || []).push(t);
      return acc;
    }, {} as Record<string, typeof transactions>);

  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-slate-900 shadow-2xl sm:border-x sm:border-slate-200 dark:border-slate-800">
      <header className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
          Voltar
        </button>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50 flex flex-col">
          <span>{type === 'income' ? 'Rendas' : 'Despesas'}</span>
          {monthParam && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal capitalize">
              {format(parseISO(`${monthParam}-01`), 'MMMM yyyy', { locale: ptBR })}
            </span>
          )}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {dates.length === 0 && (
          <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed mt-8">
            <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhuma transação encontrada.</p>
          </div>
        )}
        {dates.map(date => (
          <div key={date}>
            <div className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
            <ul className="space-y-3">
              {grouped[date].map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const block = t.blockId ? blocks.find(b => b.id === t.blockId) : null;
                return (
                  <li key={t.id} className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex justify-between items-center shadow-md backdrop-blur-sm transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => navigate(`/edit/${t.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.description || cat?.name || 'Transação'}</span>
                        {block && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">{block.name}</span>}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {cat?.name}
                      </div>
                    </div>
                    <span className={cn("font-bold text-base", t.type === 'income' ? 'text-emerald-400' : 'text-red-400')}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
