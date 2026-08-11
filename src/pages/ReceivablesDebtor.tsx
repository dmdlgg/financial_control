import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { formatCurrencyInput } from '../lib/utils';
import { ArrowLeft, ChevronRight, Plus, Pencil } from 'lucide-react';

export function ReceivablesDebtor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const debtor = useLiveQuery(() => id ? db.receivableDebtors.get(id) : undefined, [id]);
  const category = useLiveQuery(() => debtor ? db.receivableCategories.get(debtor.categoryId) : undefined, [debtor]);
  const debts = useLiveQuery(() => id ? db.receivableDebts.where('debtorId').equals(id).toArray() : [], [id]);

  const totalRemaining = debts?.reduce((sum, d) => sum + d.remainingAmount, 0) || 0;

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)}><ArrowLeft /></button>
          <h1 className="text-2xl font-bold mt-2">{debtor?.name || 'Devedor'}</h1>
          <p className="text-sm text-slate-500">{category?.name}</p>
        </div>
        {id && (
          <button
            onClick={() => navigate(`/receivables/new-debtor/${id}`)}
            className="p-2 rounded-xl hover:bg-bg-elevated text-text-secondary transition-colors self-start"
            aria-label="Editar devedor"
          >
            <Pencil className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="bg-bg-elevated p-5 rounded-3xl border border-border mb-6">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Total do devedor</p>
        <p className="text-3xl font-bold text-text-primary mt-1">{formatCurrencyInput(Math.round(totalRemaining * 100).toString())}</p>
      </div>

      {debts?.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhuma dívida cadastrada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {debts?.map(debt => (
            <li
              key={debt.id}
              onClick={() => navigate(`/receivables/debt/${debt.id}`)}
              className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{debt.description}</p>
                <p className="text-xs text-slate-500">{debt.installmentsCount} parcelas · {formatCurrencyInput(Math.round(debt.remainingAmount * 100).toString())} restantes</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-500">{formatCurrencyInput(Math.round(debt.remainingAmount * 100).toString())}</p>
                <ChevronRight className="w-5 h-5 text-slate-400 inline-block" />
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => navigate(`/receivables/new-debt?debtorId=${id}`)}
        className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-95 transition-all z-40"
        aria-label="Nova dívida"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
