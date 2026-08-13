import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ReceivableDebt } from '../db';
import { ArrowLeft } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';
import { formatMonth, generateInstallments } from '../lib/receivables';

export function ReceivablesNewDebt() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const debtorId = searchParams.get('debtorId') || '';

  const existing = useLiveQuery(
    () => (id ? db.receivableDebts.get(id) : undefined),
    [id]
  );
  const installments = useLiveQuery(
    () => (id ? db.receivableInstallments.where('debtId').equals(id).toArray() : []),
    [id]
  );

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [startMonth, setStartMonth] = useState(formatMonth(new Date()));

  const hasPaid = installments?.some(
    i => i.status === 'paid' || i.status === 'partial'
  ) ?? false;

  useEffect(() => {
    if (existing) {
      setDescription(existing.description);
      setTotalAmount(formatCurrencyInput(existing.totalAmount.toFixed(2)));
      setInstallmentsCount(String(existing.installmentsCount));
      setStartMonth(existing.startMonth);
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !totalAmount || !installmentsCount || !debtorId) return;

    const amount = parseCurrencyInput(totalAmount);
    const count = parseInt(installmentsCount, 10);
    if (count <= 0) return;

    if (id) {
      if (hasPaid) {
        await db.receivableDebts.update(id, { description });
      } else {
        await db.receivableDebts.update(id, {
          description,
          totalAmount: amount,
          remainingAmount: amount,
          installmentsCount: count,
          startMonth
        });
        await db.receivableInstallments.where('debtId').equals(id).delete();
        const updated: ReceivableDebt = {
          ...(existing as ReceivableDebt),
          description,
          totalAmount: amount,
          remainingAmount: amount,
          installmentsCount: count,
          startMonth
        };
        await generateInstallments(updated);
      }
    } else {
      const debtId = crypto.randomUUID();
      const debt: ReceivableDebt = {
        id: debtId,
        debtorId,
        description,
        totalAmount: amount,
        remainingAmount: amount,
        installmentsCount: count,
        startMonth,
        createdAt: new Date().toISOString()
      };
      await db.receivableDebts.add(debt);
      await generateInstallments(debt);
    }

    navigate(-1);
  };

  const inputClassName =
    'w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all';

  const disabledClassName =
    'w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-secondary text-sm cursor-not-allowed opacity-70';

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center gap-4 bg-bg-primary sticky top-0 z-10 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">
          {id ? 'Editar Dívida' : 'Nova Dívida'}
        </h1>
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputClassName}
              placeholder="Ex: Compra parcelada"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
              Valor total
            </label>
            <input
              inputMode="numeric"
              value={totalAmount}
              onChange={e => setTotalAmount(formatCurrencyInput(e.target.value))}
              className={hasPaid ? disabledClassName : inputClassName}
              placeholder="R$ 0,00"
              required
              disabled={hasPaid}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
              Nº de parcelas
            </label>
            <input
              inputMode="numeric"
              value={installmentsCount}
              onChange={e => setInstallmentsCount(e.target.value.replace(/\D/g, ''))}
              className={hasPaid ? disabledClassName : inputClassName}
              placeholder="1"
              required
              disabled={hasPaid}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
              Primeiro mês
            </label>
            <input
              type="month"
              value={startMonth}
              onChange={e => setStartMonth(e.target.value)}
              className={hasPaid ? disabledClassName : inputClassName}
              required
              disabled={hasPaid}
            />
          </div>

          {hasPaid && (
            <p className="text-xs text-text-secondary">
              Esta dívida já possui parcelas pagas. Apenas a descrição pode ser editada.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-accent text-accent-inverse font-semibold py-4 rounded-2xl text-base transition-colors mt-6 hover:opacity-90"
          >
            {id ? 'Atualizar Dívida' : 'Salvar Dívida'}
          </button>
        </form>
      </div>
    </div>
  );
}
