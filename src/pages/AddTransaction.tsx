import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TransactionType, type TransactionStatus } from '../db';
import { format, parseISO, addMonths, differenceInCalendarMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Trash2, Repeat, AlertTriangle, X, Layers } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';
import {
  processRecurringTransactions,
  deleteRecurringRuleAndTransactions,
  deleteFutureRecurringTransactions
} from '../lib/recurrence';

export function AddTransaction() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];

  const existingTransaction = useLiveQuery(
    () => id ? db.transactions.get(id) : undefined,
    [id]
  );

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const queryParams = new URLSearchParams(location.search);
  const initialDate = queryParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const initialBlockId = queryParams.get('blockId') || '';
  const [date, setDate] = useState(initialDate);
  const [blockId, setBlockId] = useState(initialBlockId);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('completed');

  // Recorrência e Parcelas
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'indefinite' | 'limited'>('indefinite');
  const [installmentsCount, setInstallmentsCount] = useState<number>(10);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => {
    try {
      const end = addMonths(parseISO(initialDate), 9);
      return format(end, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  });

  // Modal de exclusão de recorrência
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const recurringRule = useLiveQuery(
    () => existingTransaction?.recurrenceId ? db.recurringTransactions.get(existingTransaction.recurrenceId) : undefined,
    [existingTransaction?.recurrenceId]
  );

  useEffect(() => {
    if (existingTransaction) {
      setType(existingTransaction.type);
      setAmount(formatCurrencyInput(existingTransaction.amount.toFixed(2).replace(/\D/g, '')));
      setCategoryId(existingTransaction.categoryId);
      setDate(existingTransaction.date);
      setBlockId(existingTransaction.blockId || '');
      setDescription(existingTransaction.description || '');
      setStatus(existingTransaction.status);
    }
  }, [existingTransaction]);

  // Atualiza data final quando data ou parcelas mudam
  const handleInstallmentsChange = (count: number) => {
    const validCount = Math.max(1, count);
    setInstallmentsCount(validCount);
    try {
      const start = parseISO(date);
      const end = addMonths(start, validCount - 1);
      setRecurrenceEndDate(format(end, 'yyyy-MM-dd'));
    } catch {
      // ignore
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (recurrenceType === 'limited' && installmentsCount) {
      try {
        const start = parseISO(newDate);
        const end = addMonths(start, installmentsCount - 1);
        setRecurrenceEndDate(format(end, 'yyyy-MM-dd'));
      } catch {
        // ignore
      }
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setRecurrenceEndDate(newEnd);
    try {
      const start = parseISO(date);
      const end = parseISO(newEnd);
      const diff = differenceInCalendarMonths(end, start) + 1;
      if (diff > 0) {
        setInstallmentsCount(diff);
      }
    } catch {
      // ignore
    }
  };

  const availableCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    const parsedAmount = parseCurrencyInput(amount);

    if (id) {
      if (!existingTransaction?.recurrenceId && isRecurring) {
        const recurringId = crypto.randomUUID();
        const total = recurrenceType === 'limited' ? installmentsCount : undefined;

        await db.recurringTransactions.add({
          id: recurringId,
          type,
          amount: parsedAmount,
          categoryId,
          startDate: date,
          blockId: blockId || undefined,
          description,
          status,
          recurrenceType,
          recurrenceEndDate: recurrenceType === 'limited' ? recurrenceEndDate : undefined,
          installmentsCount: total,
          lastGeneratedDate: date
        });

        await db.transactions.update(id, {
          type,
          amount: parsedAmount,
          categoryId,
          date,
          blockId: blockId || undefined,
          description,
          status,
          recurrenceId: recurringId,
          installmentNumber: total ? 1 : undefined,
          installmentTotal: total
        });

        await processRecurringTransactions();
      } else {
        await db.transactions.update(id, {
          type,
          amount: parsedAmount,
          categoryId,
          date,
          blockId: blockId || undefined,
          description,
          status
        });
      }
    } else {
      if (isRecurring) {
        const recurringId = crypto.randomUUID();
        const total = recurrenceType === 'limited' ? installmentsCount : undefined;

        await db.recurringTransactions.add({
          id: recurringId,
          type,
          amount: parsedAmount,
          categoryId,
          startDate: date,
          blockId: blockId || undefined,
          description,
          status,
          recurrenceType,
          recurrenceEndDate: recurrenceType === 'limited' ? recurrenceEndDate : undefined,
          installmentsCount: total
        });

        await processRecurringTransactions();
      } else {
        await db.transactions.add({
          id: crypto.randomUUID(),
          type,
          amount: parsedAmount,
          categoryId,
          date,
          blockId: blockId || undefined,
          description,
          status
        });
      }
    }
    navigate(-1);
  };

  const handleStopRecurrence = async () => {
    if (existingTransaction?.recurrenceId && confirm('Deseja cancelar esta repetição? Todas as parcelas/ocorrências futuras a partir desta data serão canceladas.')) {
      await deleteFutureRecurringTransactions(existingTransaction.recurrenceId, existingTransaction.date);
      navigate(-1);
    }
  };

  const handleDeleteClick = () => {
    if (!id) return;
    if (existingTransaction?.recurrenceId) {
      setShowDeleteModal(true);
    } else {
      if (confirm('Tem certeza que deseja excluir esta transação?')) {
        db.transactions.delete(id).then(() => navigate(-1));
      }
    }
  };

  const handleDeleteOnlyThis = async () => {
    if (!id) return;
    await db.transactions.delete(id);
    setShowDeleteModal(false);
    navigate(-1);
  };

  const handleDeleteFuture = async () => {
    if (!existingTransaction?.recurrenceId) return;
    await deleteFutureRecurringTransactions(existingTransaction.recurrenceId, existingTransaction.date);
    setShowDeleteModal(false);
    navigate(-1);
  };

  const handleDeleteAll = async () => {
    if (!existingTransaction?.recurrenceId) return;
    await deleteRecurringRuleAndTransactions(existingTransaction.recurrenceId);
    setShowDeleteModal(false);
    navigate(-1);
  };

  // Informações da parcela atual para exibição
  const isInstallment = existingTransaction?.installmentNumber != null && existingTransaction?.installmentTotal != null;
  const installmentPercent = isInstallment
    ? Math.round((existingTransaction.installmentNumber! / existingTransaction.installmentTotal!) * 100)
    : 0;

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border relative">
      <header className="p-4 flex items-center justify-between bg-bg-primary sticky top-0 z-10 border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">{id ? 'Editar Transação' : 'Nova Transação'}</h1>
        </div>
        {id && (
          <button onClick={handleDeleteClick} className="p-2 -mr-2 rounded-full hover:bg-danger/10 text-danger transition-colors" title="Excluir">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24">
        {/* Banner se for uma parcela existente */}
        {isInstallment && (
          <div className="mb-6 p-4 rounded-3xl bg-bg-elevated border border-border shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-text-primary">
                Parcela {existingTransaction.installmentNumber} de {existingTransaction.installmentTotal}
              </span>
              <span className="font-bold text-accent">{installmentPercent}% quitado</span>
            </div>
            <div className="h-2 w-full bg-bg-surface rounded-full overflow-hidden border border-border/60">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${installmentPercent}%` }}
              />
            </div>
          </div>
        )}

        {!id && (
          <div className="flex bg-bg-elevated rounded-2xl p-1 mb-6 border border-border">
            <button
              type="button"
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${type === 'expense' ? 'bg-danger text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              onClick={() => setType('expense')}
            >
              Despesa
            </button>
            <button
              type="button"
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${type === 'income' ? 'bg-success text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              onClick={() => setType('income')}
            >
              Renda
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-semibold text-lg">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(formatCurrencyInput(e.target.value))}
                className="w-full bg-bg-elevated border border-border rounded-2xl py-4 pl-12 pr-4 text-text-primary text-2xl font-bold focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Descrição (Opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-2xl p-3.5 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="Ex: Aluguel, Supermercado, Notebook..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none" required>
                <option value="" disabled>Selecione</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => handleDateChange(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>
          </div>

          {/* Bloco Organizador */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              Bloco Organizador (Opcional)
            </label>
            <select
              value={blockId}
              onChange={e => setBlockId(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none"
            >
              <option value="">Nenhum bloco (avulso)</option>
              {blocks.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Status</label>
            <div className="flex bg-bg-elevated rounded-xl p-1 border border-border">
              <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'completed' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`} onClick={() => setStatus('completed')}>Realizado</button>
              <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'planned' ? 'bg-purple-500 text-white shadow-sm' : 'text-text-secondary'}`} onClick={() => setStatus('planned')}>Planejado</button>
            </div>
          </div>

          {/* Configuração de Repetição / Parcelas */}
          {(!id || (id && !existingTransaction?.recurrenceId)) && (
            <div className="bg-bg-elevated rounded-2xl p-4 border border-border space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="w-5 h-5 rounded border-border text-accent focus:ring-accent bg-bg-surface"
                />
                <span className="text-sm font-medium text-text-primary">Repetir / Parcelar</span>
              </label>

              {isRecurring && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex bg-bg-surface rounded-xl p-1 border border-border">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${recurrenceType === 'indefinite' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`}
                      onClick={() => setRecurrenceType('indefinite')}
                    >
                      Indefinido (Fixo)
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${recurrenceType === 'limited' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`}
                      onClick={() => setRecurrenceType('limited')}
                    >
                      Parcelas (Com Limite)
                    </button>
                  </div>

                  {recurrenceType === 'limited' && (
                    <div className="space-y-3 bg-bg-surface/50 p-3.5 rounded-2xl border border-border/60">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">
                            Nº de Parcelas
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="2"
                              max="120"
                              value={installmentsCount}
                              onChange={e => handleInstallmentsChange(parseInt(e.target.value) || 2)}
                              className="w-full bg-bg-elevated border border-border rounded-xl p-2.5 text-text-primary text-sm font-bold focus:outline-none focus:border-accent"
                              required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary font-bold">x</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">
                            Termina em
                          </label>
                          <input
                            type="date"
                            value={recurrenceEndDate}
                            onChange={e => handleEndDateChange(e.target.value)}
                            className="w-full bg-bg-elevated border border-border rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                            required
                          />
                        </div>
                      </div>

                      {/* Resumo da contagem de parcelas */}
                      <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent">
                        <p className="font-semibold">
                          📦 Parcela de {installmentsCount}x:
                        </p>
                        <p className="mt-0.5 text-[11px] opacity-90">
                          Começa como <strong>1/{installmentsCount}</strong> em {format(parseISO(date), 'MMMM/yyyy', { locale: ptBR })} e encerra como <strong>{installmentsCount}/{installmentsCount}</strong> em {recurrenceEndDate ? format(parseISO(recurrenceEndDate), 'MMMM/yyyy', { locale: ptBR }) : '...'}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {id && existingTransaction?.recurrenceId && recurringRule && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-700/30 space-y-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">Esta é uma transação recorrente mensal / parcelada.</p>
              <button
                type="button"
                onClick={() => navigate(`/edit-recurrence/${existingTransaction.recurrenceId}`)}
                className="w-full py-2.5 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Repeat className="w-4 h-4" /> Ver/Editar regra de recorrência
              </button>
              <button
                type="button"
                onClick={handleStopRecurrence}
                className="w-full py-2.5 text-xs font-semibold bg-bg-surface text-danger rounded-xl border border-danger/20 hover:bg-danger/10 transition-colors"
              >
                Cancelar repetições futuras
              </button>
            </div>
          )}

          <button type="submit" className="w-full bg-accent text-accent-inverse font-semibold py-4 rounded-2xl text-base transition-colors mt-6 hover:opacity-90">
            {id ? 'Atualizar Transação' : 'Salvar Transação'}
          </button>
        </form>
      </div>

      {/* Modal de confirmação de exclusão para recorrências / parcelas */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-elevated border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-danger/10 text-danger">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 rounded-full hover:bg-bg-surface text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-text-primary">Excluir Transação Recorrente</h3>
              <p className="text-xs text-text-secondary mt-1">
                Esta transação faz parte de uma repetição/parcela que existe em outros meses. Como deseja excluí-la?
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleDeleteAll}
                className="w-full py-3 px-4 rounded-2xl bg-danger text-white font-semibold text-xs text-left hover:opacity-90 transition-opacity flex flex-col gap-0.5"
              >
                <span>Excluir todas as parcelas / repetições</span>
                <span className="text-[10px] opacity-80 font-normal">Apaga de todos os meses e encerra a recorrência</span>
              </button>

              <button
                onClick={handleDeleteFuture}
                className="w-full py-3 px-4 rounded-2xl bg-bg-surface border border-border text-text-primary font-semibold text-xs text-left hover:bg-bg-elevated transition-colors flex flex-col gap-0.5"
              >
                <span>Excluir desta em diante (atual e futuras)</span>
                <span className="text-[10px] text-text-secondary font-normal">Mantém o histórico passado e cancela as próximas</span>
              </button>

              <button
                onClick={handleDeleteOnlyThis}
                className="w-full py-2.5 px-4 rounded-2xl text-text-secondary hover:text-text-primary text-xs font-medium text-center hover:bg-bg-surface transition-colors"
              >
                Excluir apenas a transação deste mês
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
