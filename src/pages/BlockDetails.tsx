import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, Plus, Layers } from 'lucide-react';
import { formatCurrencyInput } from '../lib/utils';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMonthStore } from '../store/monthStore';
import { TransactionItem } from '../components/TransactionItem';

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

  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');
  const spent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const received = incomes.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center justify-between bg-bg-primary sticky top-0 z-10 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-text-primary truncate flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent shrink-0" />
              {block.name}
            </h1>
            <p className="text-xs text-text-secondary capitalize">
              {format(targetDate, 'MMMM yyyy', { locale: ptBR })} • Bloco Organizador
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/add?blockId=${block.id}&date=${format(targetDate, 'yyyy-MM-dd')}`)}
          className="p-2 rounded-xl bg-accent text-accent-inverse hover:opacity-90 transition-opacity"
          title="Adicionar transação neste bloco"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24 space-y-6">
        <section className="bg-bg-elevated p-6 rounded-3xl shadow-lg border border-border">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">Total no Mês</p>
          <p className="text-3xl font-bold text-text-primary">{formatCurrencyInput(Math.round(spent * 100).toString())}</p>
          
          <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-text-secondary">
            <span>{transactions.length} {transactions.length === 1 ? 'item organizado' : 'itens organizados'}</span>
            {received > 0 && <span className="text-success font-medium">Entradas: +{formatCurrencyInput(Math.round(received * 100).toString())}</span>}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Transações do Bloco</h2>
          {transactions.length === 0 ? (
            <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
              <p className="text-text-secondary text-sm">Nenhum item adicionado a este bloco neste mês.</p>
              <button
                onClick={() => navigate(`/add?blockId=${block.id}&date=${format(targetDate, 'yyyy-MM-dd')}`)}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-accent text-accent-inverse rounded-xl hover:opacity-90 transition-opacity"
              >
                + Adicionar Item ao Bloco
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {[...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                return (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    category={cat}
                    block={block}
                    onClick={() => navigate(`/edit/${t.id}`)}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
