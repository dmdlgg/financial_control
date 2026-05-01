import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Trash2 } from 'lucide-react';
import { useDndSortable, SortableItem } from '../lib/dndkit';

export function BlocksOrderSettings() {
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
  const [orderedBlocks, setOrderedBlocks] = useState(() => blocks.slice().sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return a.id.localeCompare(b.id);
  }));

  // Atualiza orderedBlocks quando blocks muda
  // (evita bug de ordem ao adicionar/remover)
  useEffect(() => {
    setOrderedBlocks(blocks.slice().sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return a.id.localeCompare(b.id);
    }));
  }, [blocks]);

  const { DndContext, SortableContext, verticalListSortingStrategy, sensors, handleDragEnd, handleDragStart } = useDndSortable(orderedBlocks, async (newOrder) => {
    setOrderedBlocks(newOrder);
    await Promise.all(
      newOrder.map((b, i) => db.blocks.update(b.id, { order: i }))
    );
  });

  const handleDeleteBlock = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este bloco?')) {
      await db.blocks.delete(id);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <SortableContext items={orderedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {orderedBlocks.map(b => (
            <SortableItem key={b.id} id={b.id}>
              <li className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:bg-slate-800/60 transition-colors cursor-pointer group">
                <span className="opacity-70 group-hover:opacity-100 mr-2" style={{ cursor: 'grab', padding: '0 10px 0 2px', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="6" r="1.3" fill="#94a3b8"/><circle cx="5" cy="10" r="1.3" fill="#94a3b8"/><circle cx="5" cy="14" r="1.3" fill="#94a3b8"/><circle cx="10" cy="6" r="1.3" fill="#94a3b8"/><circle cx="10" cy="10" r="1.3" fill="#94a3b8"/><circle cx="10" cy="14" r="1.3" fill="#94a3b8"/><circle cx="15" cy="6" r="1.3" fill="#94a3b8"/><circle cx="15" cy="10" r="1.3" fill="#94a3b8"/><circle cx="15" cy="14" r="1.3" fill="#94a3b8"/></svg>
                </span>
                <div>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">{b.name} <span className="text-slate-400 dark:text-slate-500 text-xs ml-2 font-normal">({b.period === 'monthly' ? 'Mensal' : 'Semanal'})</span></p>
                  <p className="text-blue-400 font-medium text-sm mt-0.5">R$ {b.totalAmount.toFixed(2)}</p>
                </div>
                <button onClick={() => handleDeleteBlock(b.id)} className="text-red-400 hover:text-red-300 p-2 rounded-xl bg-red-400/10 hover:bg-red-400/20 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
