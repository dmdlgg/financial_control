import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Layers, CreditCard } from 'lucide-react';
import { cn, formatCurrencyInput } from '../lib/utils';
import { DragHandle } from '../components/DragHandle';
import { useDndSortable, SortableItem } from '../lib/dndkit';
import { closestCenter } from '@dnd-kit/core';
import { useMonthStore } from '../store/monthStore';
import { TransactionItem } from '../components/TransactionItem';

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
  const limitedCount = useLiveQuery(() => db.recurringTransactions.where('recurrenceType').equals('limited').count()) || 0;

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

  const recentTransactions = transactions ? [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) : [];

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

      {/* Banner / Atalho para Minhas Parcelas */}
      <div
        onClick={() => navigate('/installments')}
        className="bg-bg-elevated p-4 rounded-3xl border border-border shadow-md mb-8 flex items-center justify-between cursor-pointer hover:border-accent transition-all group"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-accent/15 text-accent">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-text-primary text-sm">Minhas Parcelas</h2>
              {limitedCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold border border-accent/20">
                  {limitedCount} {limitedCount === 1 ? 'plano' : 'planos'}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Ver todas as compras parceladas organizadas por categoria
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors shrink-0" />
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Meus Blocos</h2>
            <p className="text-xs text-text-secondary">Organização por grupos e serviços</p>
          </div>
        </div>

        {!blocks || blocks.length === 0 ? (
          <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
            <p className="text-text-secondary text-sm">Nenhum bloco configurado.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <SortableContext items={orderedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {orderedBlocks.map((block) => {
                  const blockTxs = (transactions || []).filter(t => t.blockId === block.id);
                  const blockTotal = blockTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
                  const count = blockTxs.length;

                  return (
                    <SortableItem key={block.id} id={block.id}>
                      <div
                        onClick={() => navigate(`/block/${block.id}?month=${format(currentDate, 'yyyy-MM')}`)}
                        className={cn(
                          "bg-bg-elevated p-4 sm:p-5 rounded-3xl border border-border shadow-md transition-all hover:scale-[1.01] cursor-pointer flex items-center group"
                        )}
                      >
                        <DragHandle className="opacity-70 group-hover:opacity-100 mr-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-text-primary text-base truncate">{block.name}</h3>
                                <p className="text-xs text-text-secondary">
                                  {count} {count === 1 ? 'item vinculado' : 'itens vinculados'} neste mês
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">Total</p>
                                <p className="text-base font-bold text-text-primary">
                                  {formatCurrencyInput(Math.round(blockTotal * 100).toString())}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-text-secondary/50 group-hover:text-text-primary transition-colors" />
                            </div>
                          </div>

                          {/* Previews dos itens organizados no bloco */}
                          {count > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5 flex-wrap">
                              {blockTxs.slice(0, 4).map(t => (
                                <span
                                  key={t.id}
                                  className="text-[11px] px-2.5 py-1 rounded-xl bg-bg-surface text-text-secondary border border-border/70 truncate max-w-[140px]"
                                >
                                  {t.description || 'Transação'}
                                </span>
                              ))}
                              {count > 4 && (
                                <span className="text-[11px] px-2 py-1 rounded-xl bg-bg-surface text-text-secondary font-medium">
                                  +{count - 4} mais
                                </span>
                              )}
                            </div>
                          )}
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
              const blk = blocks?.find(b => b.id === t.blockId);
              return (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  category={cat}
                  block={blk}
                  onClick={() => navigate(`/edit/${t.id}`)}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
