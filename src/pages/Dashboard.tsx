import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatCurrencyInput } from '../lib/utils';
import { DragHandle } from '../components/DragHandle';
import { useDndSortable, SortableItem } from '../lib/dndkit';
import { closestCenter } from '@dnd-kit/core';
import { useMonthStore } from '../store/monthStore';

export function Dashboard() {
  const navigate = useNavigate();
  const currentDate = useMonthStore((s) => s.currentDate);
  const goToPreviousMonth = useMonthStore((s) => s.goToPreviousMonth);
  const goToNextMonth = useMonthStore((s) => s.goToNextMonth);

  const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const transactions = useLiveQuery(
    () => db.transactions
      .where('date')
      .between(start, end, true, true)
      .toArray(),
    [start, end]
  );

  const blocks = useLiveQuery(() => db.blocks.toArray());

  const orderedBlocks = useMemo(() => {
    return (blocks || []).slice().sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [blocks]);

  const {
    DndContext,
    SortableContext,
    verticalListSortingStrategy,
    sensors,
    handleDragEnd,
    handleDragStart,
  } = useDndSortable(orderedBlocks, async (newOrder) => {
    await Promise.all(
      newOrder.map((b, i) => db.blocks.update(b.id, { order: i }))
    );
  });

  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const incomes = transactions?.filter(t => t.type === 'income') || [];
  const expenses = transactions?.filter(t => t.type === 'expense' && t.status === 'completed') || [];

  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const recentTransactions = transactions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) || [];

  return (
    <div className="p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Visão Geral</h1>

        <div className="flex items-center justify-between bg-bg-elevated p-2 rounded-2xl border border-border">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-elevated p-5 rounded-3xl shadow-lg border border-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-accent"></div>
          <h2 className="text-sm font-medium text-text-secondary mb-1">Saldo Atual</h2>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-accent' : 'text-danger'}`}>
            {formatCurrencyInput(Math.round(balance * 100).toString())}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:col-span-2 gap-4">
          <button
            className="bg-bg-elevated p-4 rounded-3xl shadow-lg border border-border text-left w-full"
            onClick={() => navigate(`/transactions?type=income&month=${format(currentDate, 'yyyy-MM')}`)}
          >
            <h2 className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Rendas</h2>
            <p className="text-xl font-semibold text-success">{formatCurrencyInput(Math.round(totalIncome * 100).toString())}</p>
          </button>
          <button
            className="bg-bg-elevated p-4 rounded-3xl shadow-lg border border-border text-left w-full"
            onClick={() => navigate(`/transactions?type=expense&month=${format(currentDate, 'yyyy-MM')}`)}
          >
            <h2 className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Despesas</h2>
            <p className="text-xl font-semibold text-danger">{formatCurrencyInput(Math.round(totalExpense * 100).toString())}</p>
          </button>
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Meus Blocos</h2>
        </div>

        {!blocks || blocks.length === 0 ? (
          <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
            <p className="text-text-secondary text-sm">Nenhum bloco configurado.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <SortableContext items={orderedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {orderedBlocks.map((block) => {
                  const blockExpenses = expenses.filter(e => e.blockId === block.id).reduce((acc, curr) => acc + curr.amount, 0);
                  const remaining = block.totalAmount - blockExpenses;
                  const percent = Math.min((blockExpenses / block.totalAmount) * 100, 100);
                  return (
                    <SortableItem key={block.id} id={block.id}>
                      <div
                        onClick={() => navigate(`/block/${block.id}?month=${format(currentDate, 'yyyy-MM')}`)}
                        className={cn(
                          "bg-bg-elevated p-5 rounded-3xl border border-border shadow-md transition-transform hover:scale-[1.02] cursor-pointer flex items-center group"
                        )}
                      >
                        <DragHandle className="opacity-70 group-hover:opacity-100" />
                        <div className="flex-1 ml-2">
                          <div className="flex justify-between items-end mb-3">
                            <div>
                              <h3 className="font-semibold text-text-primary text-lg">{block.name}</h3>
                              <p className="text-xs text-text-secondary mt-0.5">Orçamento: {formatCurrencyInput(Math.round(block.totalAmount * 100).toString())}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatCurrencyInput(Math.round(remaining * 100).toString())} restam
                              </p>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${percent > 90 ? 'bg-danger' : percent > 75 ? 'bg-yellow-500' : 'bg-accent'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="mt-2 text-right">
                            <span className="text-[10px] uppercase font-semibold text-text-secondary tracking-wider">Gasto: {formatCurrencyInput(Math.round(blockExpenses * 100).toString())}</span>
                          </div>
                        </div>
                      </div>
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section className="mt-8 mb-4">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Transações Recentes</h2>
        {recentTransactions.length === 0 ? (
          <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
            <p className="text-text-secondary text-sm">Nenhuma transação recente.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recentTransactions.map(t => {
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
        )}
      </section>
    </div>
  );
}
