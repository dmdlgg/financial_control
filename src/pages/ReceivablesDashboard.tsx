import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { db } from '../db';
import { hasPendingMonthEndInstallments, formatMonth, getPendingMonthAmount } from '../lib/receivables';
import { formatCurrencyInput } from '../lib/utils';
import { useMonthStore } from '../store/monthStore';
import { Wallet, ChevronRight, History, Plus } from 'lucide-react';

export function ReceivablesDashboard() {
  const navigate = useNavigate();
  const currentDate = useMonthStore(state => state.currentDate);
  const monthKey = formatMonth(currentDate);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const categories = useLiveQuery(() => db.receivableCategories.toArray()) || [];
  const debtors = useLiveQuery(() => db.receivableDebtors.toArray()) || [];
  const debts = useLiveQuery(() => db.receivableDebts.toArray()) || [];
  const installments = useLiveQuery(() => db.receivableInstallments.toArray()) || [];
  const showBanner = useLiveQuery(hasPendingMonthEndInstallments, []);

  const totalRemaining = getPendingMonthAmount(installments, monthKey);

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">A Receber</h1>
        <button onClick={() => navigate('/receivables/history')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <History className="w-5 h-5" />
        </button>
      </header>

      {showBanner && !dismissedBanner && (
        <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 p-4 rounded-2xl mb-6">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Há parcelas deste mês ainda não confirmadas. Já recebeu?</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => navigate('/receivables')} className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-xl hover:bg-amber-700 active:scale-95 transition-all">Ver parcelas</button>
            <button onClick={() => setDismissedBanner(true)} className="px-4 py-2 text-sm font-medium border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-800/40 active:scale-95 transition-all">Depois</button>
          </div>
        </div>
      )}

      <div className="bg-bg-elevated p-5 rounded-3xl border border-border mb-6">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Total a receber este mês</p>
        <p className="text-3xl font-bold text-text-primary mt-1">{formatCurrencyInput(Math.round(totalRemaining * 100).toString())}</p>
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
            const catDebtIds = debts.filter(d => catDebtorIds.includes(d.debtorId)).map(d => d.id);
            const catRemaining = getPendingMonthAmount(installments.filter(i => catDebtIds.includes(i.debtId)), monthKey);
            return (
              <li
                key={cat.id}
                onClick={() => navigate(`/receivables/category/${cat.id}`)}
                className="p-4 rounded-3xl border flex items-center justify-between cursor-pointer"
                style={{
                  backgroundColor: cat.color ? `${cat.color}15` : '#3b82f615',
                  borderColor: cat.color ? `${cat.color}30` : '#3b82f630'
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cat.color ? `${cat.color}20` : '#3b82f620' }}
                  >
                    <Wallet className="w-5 h-5" style={{ color: cat.color || '#3b82f6' }} />
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">{cat.name}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: cat.color || '#3b82f6' }}>{formatCurrencyInput(Math.round(catRemaining * 100).toString())}</p>
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
