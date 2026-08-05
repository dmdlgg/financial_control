import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TransactionType, type TransactionStatus } from '../db';
import { format } from 'date-fns';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';
import { processRecurringTransactions } from '../lib/recurrence';
import { useLocation } from 'react-router-dom';

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
  const [date, setDate] = useState(initialDate);
  const [blockId, setBlockId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('completed');

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'indefinite' | 'limited'>('indefinite');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

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

  const availableCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    if (id) {
      if (!existingTransaction?.recurrenceId && isRecurring) {
        const recurringId = crypto.randomUUID();
        await db.recurringTransactions.add({
          id: recurringId,
          type,
          amount: parseCurrencyInput(amount),
          categoryId,
          startDate: date,
          blockId: blockId || undefined,
          description,
          status,
          recurrenceType,
          recurrenceEndDate: recurrenceType === 'limited' ? recurrenceEndDate : undefined,
          lastGeneratedDate: date
        });

        await db.transactions.update(id, {
          type,
          amount: parseCurrencyInput(amount),
          categoryId,
          date,
          blockId: blockId || undefined,
          description,
          status,
          recurrenceId: recurringId
        });

        await processRecurringTransactions();
      } else {
        await db.transactions.update(id, {
          type,
          amount: parseCurrencyInput(amount),
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
        await db.recurringTransactions.add({
          id: recurringId,
          type,
          amount: parseCurrencyInput(amount),
          categoryId,
          startDate: date,
          blockId: blockId || undefined,
          description,
          status,
          recurrenceType,
          recurrenceEndDate: recurrenceType === 'limited' ? recurrenceEndDate : undefined
        });
        await processRecurringTransactions();
      } else {
        await db.transactions.add({
          id: crypto.randomUUID(),
          type,
          amount: parseCurrencyInput(amount),
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
    if (existingTransaction?.recurrenceId && confirm('Deseja cancelar esta repetição? Não serão geradas novas transações no futuro.')) {
      await db.recurringTransactions.delete(existingTransaction.recurrenceId);
      await db.transactions.update(existingTransaction.id, { recurrenceId: undefined });
    }
  };

  const handleDelete = async () => {
    if (id && confirm('Tem certeza que deseja excluir esta transação?')) {
      await db.transactions.delete(id);
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center justify-between bg-bg-primary sticky top-0 z-10 border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">{id ? 'Editar Transação' : 'Nova Transação'}</h1>
        </div>
        {id && (
          <button onClick={handleDelete} className="p-2 -mr-2 rounded-full hover:bg-danger/10 text-danger transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24">
        {!id && (
          <div className="flex bg-bg-elevated rounded-2xl p-1 mb-6 border border-border">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${type === 'expense' ? 'bg-danger text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              onClick={() => { setType('expense'); setCategoryId(''); }}
            >
              Despesa
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${type === 'income' ? 'bg-success text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              onClick={() => { setType('income'); setCategoryId(''); }}
            >
              Renda
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Valor</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(formatCurrencyInput(e.target.value))}
              className="w-full bg-bg-surface border border-border rounded-2xl p-4 text-text-primary text-3xl font-bold focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-secondary"
              placeholder="R$ 0,00"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Descrição (Opcional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" placeholder="Ex: Mercado" />
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
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" required />
            </div>
          </div>

          {type === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Bloco de Orçamento (Opcional)</label>
              <select value={blockId} onChange={e => setBlockId(e.target.value)} className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none">
                <option value="">Nenhum bloco</option>
                {blocks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Status</label>
            <div className="flex bg-bg-elevated rounded-xl p-1 border border-border">
              <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'completed' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`} onClick={() => setStatus('completed')}>Realizado</button>
              <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'planned' ? 'bg-purple-500 text-white shadow-sm' : 'text-text-secondary'}`} onClick={() => setStatus('planned')}>Planejado</button>
            </div>
          </div>

          {(!id || (id && !existingTransaction?.recurrenceId)) && (
            <div className="bg-bg-elevated rounded-2xl p-4 border border-border space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="w-5 h-5 rounded border-border text-accent focus:ring-accent bg-bg-surface"
                />
                <span className="text-sm font-medium text-text-primary">Repetir mensalmente</span>
              </label>

              {isRecurring && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex bg-bg-elevated rounded-xl p-1 border border-border">
                    <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${recurrenceType === 'indefinite' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`} onClick={() => setRecurrenceType('indefinite')}>Indefinido</button>
                    <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${recurrenceType === 'limited' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`} onClick={() => setRecurrenceType('limited')}>Com Limite</button>
                  </div>

                  {recurrenceType === 'limited' && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Repetir até</label>
                      <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="w-full bg-bg-surface border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" required={recurrenceType === 'limited'} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {id && existingTransaction?.recurrenceId && recurringRule && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-700/30">
              <p className="text-xs text-amber-800 dark:text-amber-300 mb-3 font-medium">Esta é uma transação recorrente mensal.</p>
              <button type="button" onClick={handleStopRecurrence} className="w-full py-2.5 text-xs font-semibold bg-bg-surface text-danger rounded-xl border border-danger/20 hover:bg-danger/10 transition-colors">
                Parar de repetir
              </button>
            </div>
          )}

          <button type="submit" className="w-full bg-accent text-accent-inverse font-semibold py-4 rounded-2xl text-base transition-colors mt-6 hover:opacity-90">
            {id ? 'Atualizar Transação' : 'Salvar Transação'}
          </button>
        </form>
      </div>
    </div>
  );
}
