import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Wallet, ChevronRight, History, Plus } from 'lucide-react';

export function ReceivablesDashboard() {
  const navigate = useNavigate();
  const categories = useLiveQuery(() => db.receivableCategories.toArray()) || [];
  const debtors = useLiveQuery(() => db.receivableDebtors.toArray()) || [];
  const debts = useLiveQuery(() => db.receivableDebts.toArray()) || [];

  const totalRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">A Receber</h1>
        <button onClick={() => navigate('/receivables/history')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <History className="w-5 h-5" />
        </button>
      </header>

      <div className="bg-blue-500/10 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 p-5 rounded-3xl mb-6">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total a receber</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">R$ {totalRemaining.toFixed(2)}</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Categorias</h2>
      </div>

      {categories.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
          <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhuma categoria criada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {categories.map(cat => {
            const catDebtorIds = debtors.filter(d => d.categoryId === cat.id).map(d => d.id);
            const catRemaining = debts.filter(d => catDebtorIds.includes(d.debtorId)).reduce((sum, d) => sum + d.remainingAmount, 0);
            return (
              <li
                key={cat.id}
                onClick={() => navigate(`/receivables/category/${cat.id}`)}
                className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5" style={{ color: cat.color || '#3b82f6' }} />
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">{cat.name}</p>
                    <p className="text-xs text-blue-500 font-medium mt-0.5">R$ {catRemaining.toFixed(2)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => navigate('/receivables/new-category')}
        className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-95 transition-all z-40"
        aria-label="Nova categoria"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
