import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../db';
import { format, parseISO, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrencyInput } from '../lib/utils';

export function TransactionListView() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const type = params.get('type') === 'income' ? 'income' : 'expense';
  const monthParam = params.get('month');

  const transactions = useLiveQuery(async () => {
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
    return await db.transactions.where('type').equals(type).toArray();
  }, [type, monthParam]) || [];

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];

  const grouped = transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((acc, t) => {
      (acc[t.date] = acc[t.date] || []).push(t);
      return acc;
    }, {} as Record<string, typeof transactions>);

  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center gap-4 bg-bg-primary sticky top-0 z-10 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
          Voltar
        </button>
        <h1 className="text-lg font-semibold text-text-primary flex flex-col">
          <span>{type === 'income' ? 'Rendas' : 'Despesas'}</span>
          {monthParam && (
            <span className="text-xs text-text-secondary font-normal capitalize">
              {format(parseISO(`${monthParam}-01`), 'MMMM yyyy', { locale: ptBR })}
            </span>
          )}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {dates.length === 0 && (
          <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed mt-8">
            <p className="text-text-secondary text-sm">Nenhuma transação encontrada.</p>
          </div>
        )}
        {dates.map(date => (
          <div key={date}>
            <div className="mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
              {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
            <ul className="space-y-3">
              {grouped[date].map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const block = t.blockId ? blocks.find(b => b.id === t.blockId) : null;
                return (
                  <li key={t.id} className="bg-bg-elevated p-4 rounded-3xl border border-border flex justify-between items-center shadow-md transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => navigate(`/edit/${t.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{t.description || cat?.name || 'Transação'}</span>
                        {block && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border">{block.name}</span>}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {cat?.name}
                      </div>
                    </div>
                    <span className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrencyInput(Math.round(t.amount * 100).toString())}
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
