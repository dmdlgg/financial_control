import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type ReceivableInstallment } from '../db';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';
import { formatMonth, recalculateFutureInstallments, settleDebtIfNeeded } from '../lib/receivables';

export function ReceivablesDebt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const debt = useLiveQuery(() => (id ? db.receivableDebts.get(id) : undefined), [id]);
  const debtor = useLiveQuery(() => (debt ? db.receivableDebtors.get(debt.debtorId) : undefined), [debt]);
  const category = useLiveQuery(() => (debtor ? db.receivableCategories.get(debtor.categoryId) : undefined), [debtor]);
  const catColor = category?.color || '#3b82f6';
  const installments = useLiveQuery(
    () => (id ? db.receivableInstallments.where({ debtId: id, month: formatMonth(currentDate) }).toArray() : []),
    [id, currentDate]
  );

  const [selectedInstallment, setSelectedInstallment] = useState<ReceivableInstallment | null>(null);
  const [paymentInput, setPaymentInput] = useState('');

  const goToPreviousMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const openPaymentModal = (installment: ReceivableInstallment) => {
    if (installment.status === 'paid') return;
    const remaining = installment.expectedAmount - (installment.paidAmount || 0);
    setSelectedInstallment(installment);
    setPaymentInput(formatCurrencyInput(Math.round(remaining * 100).toString()));
  };

  const closePaymentModal = () => {
    setSelectedInstallment(null);
    setPaymentInput('');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment || !id || !debt) return;

    const newPayment = parseCurrencyInput(paymentInput);
    const newPaidAmount = (selectedInstallment.paidAmount || 0) + newPayment;
    const excess = Math.max(0, newPaidAmount - selectedInstallment.expectedAmount);
    const effectivePayment = newPayment - excess;

    await db.receivableInstallments.update(selectedInstallment.id, {
      paidAmount: newPaidAmount,
      paidAt: new Date().toISOString(),
      status: newPaidAmount >= selectedInstallment.expectedAmount ? 'paid' : 'partial'
    });

    await db.receivableDebts.update(debt.id, {
      remainingAmount: Math.max(0, debt.remainingAmount - effectivePayment)
    });

    await recalculateFutureInstallments(debt.id, selectedInstallment.month);
    await settleDebtIfNeeded(debt.id);

    closePaymentModal();
  };

  const monthLabel = useMemo(() => {
    return format(currentDate, 'MMMM yyyy', { locale: ptBR });
  }, [currentDate]);

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}><ArrowLeft /></button>
          <div>
            <h1 className="text-2xl font-bold">{debt?.description || 'Dívida'}</h1>
            <p className="text-sm text-slate-500">{debtor?.name} · {category?.name}</p>
          </div>
        </div>
        {id && (
          <button
            onClick={() => navigate(`/receivables/new-debt/${id}`)}
            className="p-2 rounded-xl hover:bg-bg-elevated text-text-secondary transition-colors"
            aria-label="Editar dívida"
          >
            <Pencil className="w-5 h-5" />
          </button>
        )}
      </header>

      <div
        className="p-5 rounded-3xl border mb-6"
        style={{ backgroundColor: `${catColor}15`, borderColor: `${catColor}30` }}
      >
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: catColor }}>Restante</p>
        <p className="text-3xl font-bold mt-1" style={{ color: catColor }}>{debt ? formatCurrencyInput(Math.round(debt.remainingAmount * 100).toString()) : formatCurrencyInput('0')}</p>
      </div>

      <div className="flex items-center justify-between bg-bg-elevated p-2 rounded-2xl border border-border mb-6">
        <button onClick={goToPreviousMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary capitalize tracking-wide">{monthLabel}</h2>
        <button onClick={goToNextMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {installments?.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhuma parcela neste mês.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {installments?.map(installment => {
            const remaining = installment.expectedAmount - (installment.paidAmount || 0);
            const isPaid = installment.status === 'paid';
            const isPending = installment.status === 'pending';

            return (
              <li
                key={installment.id}
                className={`p-4 rounded-3xl border flex items-center justify-between ${isPaid ? 'line-through opacity-60' : ''}`}
                style={{ backgroundColor: `${catColor}10`, borderColor: `${catColor}25` }}
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Parcela {installment.number}</p>
                  <p className="text-xs" style={{ color: catColor }}>
                    {formatCurrencyInput(Math.round(installment.expectedAmount * 100).toString())}
                    {!isPaid && installment.paidAmount ? ` · pago ${formatCurrencyInput(Math.round(installment.paidAmount * 100).toString())}` : ''}
                    {!isPaid && remaining > 0 ? ` · falta ${formatCurrencyInput(Math.round(remaining * 100).toString())}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => openPaymentModal(installment)}
                  disabled={isPaid}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors text-white"
                  style={{ backgroundColor: isPaid ? '#22c55e' : isPending ? catColor : `${catColor}80` }}
                  aria-label={isPaid ? 'Pago' : 'Registrar pagamento'}
                >
                  <Check className="w-5 h-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-surface dark:bg-bg-elevated w-full max-w-sm rounded-3xl p-6 border border-border shadow-2xl">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Registrar pagamento</h2>
            <p className="text-sm text-text-secondary mb-4">
              Parcela {selectedInstallment.number} · esperado <span style={{ color: catColor }}>{formatCurrencyInput(Math.round(selectedInstallment.expectedAmount * 100).toString())}</span>
            </p>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
                  Valor do pagamento
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paymentInput}
                  onChange={e => setPaymentInput(formatCurrencyInput(e.target.value))}
                  className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  placeholder="R$ 0,00"
                  autoFocus
                />
                <p className="text-xs text-text-secondary mt-1.5">Digite em centavos: 180000 = R$ 1.800,00</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 py-3 rounded-2xl border border-border text-text-secondary font-medium hover:bg-bg-elevated transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl text-white font-medium hover:opacity-90 transition-colors"
                  style={{ backgroundColor: catColor }}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
