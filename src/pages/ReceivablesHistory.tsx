import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';

export function ReceivablesHistory() {
  const navigate = useNavigate();
  const settled = useLiveQuery(() => db.receivableSettledDebts.toArray()) || [];
  const categories = useLiveQuery(() => db.receivableCategories.toArray()) || [];
  const debtors = useLiveQuery(() => db.receivableDebtors.toArray()) || [];

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1 className="text-2xl font-bold">Histórico</h1>
      </header>

      {settled.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhuma dívida quitada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {settled.map(s => {
            const cat = categories.find(c => c.id === s.categoryId);
            const debtor = debtors.find(d => d.id === s.debtorId);
            return (
              <li key={s.id} className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50">
                <p className="font-semibold">{s.description}</p>
                <p className="text-xs text-slate-500">{cat?.name} → {debtor?.name}</p>
                <p className="text-sm text-emerald-500 font-medium mt-1">Quitado: R$ {s.totalAmount.toFixed(2)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
