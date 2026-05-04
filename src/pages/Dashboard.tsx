import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { DragHandle } from '../components/DragHandle';
import { useDndSortable, SortableItem } from '../lib/dndkit';
import { closestCenter } from '@dnd-kit/core';

export function Dashboard() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // Fetch transactions for the current month
  const transactions = useLiveQuery(
    () => db.transactions
      .where('date')
      .between(start, end, true, true)
      .toArray(),
    [start, end]
  );

  const blocks = useLiveQuery(() => db.blocks.toArray());
  // Ordena blocos pelo campo order (ou id como fallback)
  const [orderedBlocks, setOrderedBlocks] = useState(() => (blocks || []).slice().sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return a.id.localeCompare(b.id);
  }));

  // Atualiza orderedBlocks quando blocks muda
  React.useEffect(() => {
    if (blocks) {
      setOrderedBlocks(blocks.slice().sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        return a.id.localeCompare(b.id);
      }));
    }
  }, [blocks]);

  const {
    DndContext,
    SortableContext,
    verticalListSortingStrategy,
    sensors,
    handleDragEnd,
    handleDragStart,
  } = useDndSortable(orderedBlocks, async (newOrder) => {
    setOrderedBlocks(newOrder);
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">Visão Geral</h1>
        
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize tracking-wide">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-100 dark:bg-slate-800/80 p-5 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <h2 className="text-sm font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1">Saldo Atual</h2>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
            R$ {balance.toFixed(2)}
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:col-span-2 gap-4">
          <button
            className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm text-left w-full"
            onClick={() => navigate(`/transactions?type=income&month=${format(currentDate, 'yyyy-MM')}`)}
          >
            <h2 className="text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Rendas</h2>
            <p className="text-xl font-semibold text-emerald-400">R$ {totalIncome.toFixed(2)}</p>
          </button>
          <button
            className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm text-left w-full"
            onClick={() => navigate(`/transactions?type=expense&month=${format(currentDate, 'yyyy-MM')}`)}
          >
            <h2 className="text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Despesas</h2>
            <p className="text-xl font-semibold text-red-400">R$ {totalExpense.toFixed(2)}</p>
          </button>
        </div>
      </div>

      {/* Blocks Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Meus Blocos</h2>
        </div>
        
        {!blocks || blocks.length === 0 ? (
          <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
            <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm">Nenhum bloco configurado.</p>
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
                        onClick={() => navigate(`/block/${block.id}`)}
                        className={cn(
                          "bg-slate-100 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-md backdrop-blur-sm transition-transform hover:scale-[1.02] cursor-pointer flex items-center group"
                        )}
                      >
                        <DragHandle className="opacity-70 group-hover:opacity-100" />
                        <div className="flex-1 ml-2">
                          <div className="flex justify-between items-end mb-3">
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{block.name}</h3>
                              <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">Orçamento: R$ {block.totalAmount.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                R$ {remaining.toFixed(2)} restam
                              </p>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-white dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="mt-2 text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Gasto: R$ {blockExpenses.toFixed(2)}</span>
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

      {/* Transações Recentes Section */}
      <section className="mt-8 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Transações Recentes</h2>
        {recentTransactions.length === 0 ? (
          <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
            <p className="text-slate-400 dark:text-slate-500 dark:text-slate-400 text-sm">Nenhuma transação recente.</p>
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
        )}
      </section>
    </div>
  );
}
