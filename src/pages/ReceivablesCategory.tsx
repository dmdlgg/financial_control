import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { ArrowLeft, ChevronRight, User } from 'lucide-react';

export function ReceivablesCategory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const category = useLiveQuery(() => id ? db.receivableCategories.get(id) : undefined, [id]);
  const debtors = useLiveQuery(() => id ? db.receivableDebtors.where('categoryId').equals(id).toArray() : [], [id]);
  const debts = useLiveQuery(() => db.receivableDebts.toArray()) || [];

  const totalRemaining = debts
    .filter(d => debtors?.some(debtor => debtor.id === d.debtorId))
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1 className="text-2xl font-bold">{category?.name || 'Categoria'}</h1>
      </header>

      <div className="bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 p-5 rounded-3xl mb-6">
        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase">Total da categoria</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">R$ {totalRemaining.toFixed(2)}</p>
      </div>

      {debtors?.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhum devedor cadastrado.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {debtors?.map(debtor => {
            const debtorDebts = debts.filter(d => d.debtorId === debtor.id);
            const remaining = debtorDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
            return (
              <li
                key={debtor.id}
                onClick={() => navigate(`/receivables/debtor/${debtor.id}`)}
                className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{debtor.name}</p>
                    <p className="text-xs text-blue-500 font-medium">R$ {remaining.toFixed(2)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
