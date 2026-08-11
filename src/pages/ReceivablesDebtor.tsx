import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { formatMonth, getPendingMonthAmount, countPaidInstallments } from '../lib/receivables';
import { formatCurrencyInput } from '../lib/utils';
import { useMonthStore } from '../store/monthStore';
import { ArrowLeft, ChevronRight, Plus, Pencil } from 'lucide-react';

export function ReceivablesDebtor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentDate = useMonthStore(state => state.currentDate);
  const monthKey = formatMonth(currentDate);
  const debtor = useLiveQuery(() => id ? db.receivableDebtors.get(id) : undefined, [id]);
  const category = useLiveQuery(() => debtor ? db.receivableCategories.get(debtor.categoryId) : undefined, [debtor]);
  const debts = useLiveQuery(() => id ? db.receivableDebts.where('debtorId').equals(id).toArray() : [], [id]);
  const installments = useLiveQuery(() => db.receivableInstallments.toArray()) || [];

  const catColor = category?.color || '#3b82f6';
  const debtorDebtIds = debts?.map(d => d.id) || [];
  const debtorInstallments = installments.filter(i => debtorDebtIds.includes(i.debtId));
  const totalRemaining = getPendingMonthAmount(debtorInstallments, monthKey);

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

      <div
        className="p-5 rounded-3xl border mb-6"
        style={{ backgroundColor: `${catColor}15`, borderColor: `${catColor}30` }}
      >
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: catColor }}>Total do devedor este mês</p>
        <p className="text-3xl font-bold mt-1" style={{ color: catColor }}>{formatCurrencyInput(Math.round(totalRemaining * 100).toString())}</p>
      </div>

      {debts?.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhuma dívida cadastrada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {debts?.map(debt => {
            const debtInstallments = debtorInstallments.filter(i => i.debtId === debt.id);
            const paidCount = countPaidInstallments(debtInstallments);
            const monthRemaining = getPendingMonthAmount(debtInstallments, monthKey);
            const progressPercent = debt.installmentsCount > 0
              ? Math.min((paidCount / debt.installmentsCount) * 100, 100)
              : 0;
            return (
              <li
                key={debt.id}
                onClick={() => navigate(`/receivables/debt/${debt.id}`)}
                className="p-4 rounded-3xl border flex flex-col cursor-pointer"
                style={{ backgroundColor: `${catColor}10`, borderColor: `${catColor}25` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{debt.description}</p>
                    <p className="text-xs text-slate-500">{paidCount}/{debt.installmentsCount} parcelas pagas · {formatCurrencyInput(Math.round(monthRemaining * 100).toString())} este mês</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: catColor }}>{formatCurrencyInput(Math.round(monthRemaining * 100).toString())}</p>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
                <div className="h-2 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercent}%`, backgroundColor: catColor }}
                  />
                </div>
                <p className="text-[10px] text-text-secondary mt-1.5 text-right">{paidCount}/{debt.installmentsCount}</p>
              </li>
            );
          })}
        </ul>
      )}
      <button
        onClick={() => navigate(`/receivables/new-debt?debtorId=${id}`)}
        className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-40"
        style={{ backgroundColor: catColor }}
        aria-label="Nova dívida"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
