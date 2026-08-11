import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { formatMonth, getPendingMonthAmount } from '../lib/receivables';
import { formatCurrencyInput } from '../lib/utils';
import { useMonthStore } from '../store/monthStore';
import { ArrowLeft, ChevronRight, User, Plus, Pencil } from 'lucide-react';

export function ReceivablesCategory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentDate = useMonthStore(state => state.currentDate);
  const monthKey = formatMonth(currentDate);
  const category = useLiveQuery(() => id ? db.receivableCategories.get(id) : undefined, [id]);
  const debtors = useLiveQuery(() => id ? db.receivableDebtors.where('categoryId').equals(id).toArray() : [], [id]);
  const debts = useLiveQuery(() => db.receivableDebts.toArray()) || [];
  const installments = useLiveQuery(() => db.receivableInstallments.toArray()) || [];

  const debtorIds = debtors?.map(d => d.id) || [];
  const categoryDebtIds = debts.filter(d => debtorIds.includes(d.debtorId)).map(d => d.id);
  const categoryInstallments = installments.filter(i => categoryDebtIds.includes(i.debtId));
  const totalRemaining = getPendingMonthAmount(categoryInstallments, monthKey);

  const catColor = category?.color || '#3b82f6';

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}><ArrowLeft /></button>
          <h1 className="text-2xl font-bold">{category?.name || 'Categoria'}</h1>
        </div>
        {id && (
          <button
            onClick={() => navigate(`/receivables/new-category/${id}`)}
            className="p-2 rounded-xl hover:bg-bg-elevated text-text-secondary transition-colors"
            aria-label="Editar categoria"
          >
            <Pencil className="w-5 h-5" />
          </button>
        )}
      </header>

      <div
        className="p-5 rounded-3xl border mb-6"
        style={{ backgroundColor: `${catColor}15`, borderColor: `${catColor}30` }}
      >
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: catColor }}>Total da categoria este mês</p>
        <p className="text-3xl font-bold mt-1" style={{ color: catColor }}>{formatCurrencyInput(Math.round(totalRemaining * 100).toString())}</p>
      </div>

      {debtors?.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhum devedor cadastrado.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {debtors?.map(debtor => {
            const debtorDebtIds = debts.filter(d => d.debtorId === debtor.id).map(d => d.id);
            const remaining = getPendingMonthAmount(categoryInstallments.filter(i => debtorDebtIds.includes(i.debtId)), monthKey);
            return (
              <li
                key={debtor.id}
                onClick={() => navigate(`/receivables/debtor/${debtor.id}`)}
                className="p-4 rounded-3xl border flex items-center justify-between cursor-pointer"
                style={{ backgroundColor: `${catColor}10`, borderColor: `${catColor}25` }}
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5" style={{ color: catColor }} />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{debtor.name}</p>
                    <p className="text-xs font-medium" style={{ color: catColor }}>{formatCurrencyInput(Math.round(remaining * 100).toString())}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </li>
            );
          })}
        </ul>
      )}
      <button
        onClick={() => navigate(`/receivables/new-debtor?categoryId=${id}`)}
        className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-40"
        style={{ backgroundColor: catColor }}
        aria-label="Novo devedor"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
