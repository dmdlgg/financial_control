import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { db, type TransactionStatus } from '../db';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';
import { processRecurringTransactions, deleteRecurringRuleAndTransactions } from '../lib/recurrence';

export function EditRecurrence() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const recurrenceId = id;

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];

  const rule = useLiveQuery(
    () => recurrenceId ? db.recurringTransactions.get(recurrenceId) : undefined,
    [recurrenceId]
  );

  const childCount = useLiveQuery(
    async () => recurrenceId
      ? await db.transactions.where('recurrenceId').equals(recurrenceId).count()
      : 0,
    [recurrenceId]
  ) ?? 0;

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [blockId, setBlockId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [recurrenceType, setRecurrenceType] = useState<'indefinite' | 'limited'>('indefinite');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setType(rule.type);
      setAmount(formatCurrencyInput(rule.amount.toFixed(2).replace(/\D/g, '')));
      setCategoryId(rule.categoryId);
      setStartDate(rule.startDate);
      setBlockId(rule.blockId || '');
      setDescription(rule.description || '');
      setStatus(rule.status);
      setRecurrenceType(rule.recurrenceType);
      setRecurrenceEndDate(rule.recurrenceEndDate || '');
    }
  }, [rule]);

  const availableCategories = categories.filter(c => c.type === type);

  if (!recurrenceId) {
    return (
      <div className="p-4">
        <p className="text-text-secondary">Recorrência inválida.</p>
      </div>
    );
  }

  if (rule === undefined) {
    return (
      <div className="p-4">
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  if (rule === null || !rule) {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary">
        <header className="p-4 flex items-center gap-4 border-b border-border">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Recorrência não encontrada</h1>
        </header>
        <div className="p-4 text-text-secondary text-sm">Esta regra pode ter sido excluída.</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;
    setSaving(true);
    try {
      const parsedAmount = parseCurrencyInput(amount);
      await db.transaction('rw', [db.recurringTransactions, db.transactions], async () => {
        await db.recurringTransactions.update(recurrenceId, {
          type,
          amount: parsedAmount,
          categoryId,
          startDate,
          blockId: blockId || undefined,
          description,
          status,
          recurrenceType,
          recurrenceEndDate: recurrenceType === 'limited' ? recurrenceEndDate : undefined,
        });

        const children = await db.transactions
          .where('recurrenceId')
          .equals(recurrenceId)
          .toArray();

        await Promise.all(
          children.map(t =>
            db.transactions.update(t.id, {
              type,
              amount: parsedAmount,
              categoryId,
              blockId: blockId || undefined,
              description,
              status,
            })
          )
        );
      });

      await processRecurringTransactions();
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async () => {
    const deleteAll = confirm('Deseja excluir esta regra de recorrência e TODAS as transações/parcelas geradas por ela em todos os meses?\n\n(Clique em OK para excluir tudo, ou Cancelar se desejar apenas parar a repetição mantendo o histórico já criado)');
    setSaving(true);
    try {
      if (deleteAll) {
        await deleteRecurringRuleAndTransactions(recurrenceId);
        navigate(-1);
      } else {
        const justStop = confirm('Deseja parar a repetição e manter as transações já geradas como avulsas?');
        if (justStop) {
          await db.transaction('rw', [db.recurringTransactions, db.transactions], async () => {
            await db.recurringTransactions.delete(recurrenceId);
            const children = await db.transactions
              .where('recurrenceId')
              .equals(recurrenceId)
              .toArray();
            await Promise.all(
              children.map(t => db.transactions.update(t.id, { recurrenceId: undefined }))
            );
          });
          navigate(-1);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center justify-between bg-bg-primary sticky top-0 z-10 border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Editar Recorrência</h1>
        </div>
        <button onClick={handleDeleteRule} disabled={saving} className="p-2 -mr-2 rounded-full hover:bg-danger/10 text-danger transition-colors disabled:opacity-50">
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24">
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-200 dark:border-blue-700/30 mb-6">
          <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
            Esta regra afeta <strong>{childCount}</strong> {childCount === 1 ? 'transação' : 'transações'}.
            As alterações serão aplicadas a todas elas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex bg-bg-elevated rounded-2xl p-1 mb-2 border border-border">
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
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="Ex: Aluguel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Categoria</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none"
                required
              >
                <option value="" disabled>Selecione</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Início</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>
          </div>

          {type === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Bloco Organizador (Opcional)</label>
              <select
                value={blockId}
                onChange={e => setBlockId(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none"
              >
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
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'completed' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`}
                onClick={() => setStatus('completed')}
              >
                Realizado
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'planned' ? 'bg-purple-500 text-white shadow-sm' : 'text-text-secondary'}`}
                onClick={() => setStatus('planned')}
              >
                Planejado
              </button>
            </div>
          </div>

          <div className="bg-bg-elevated rounded-2xl p-4 border border-border space-y-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Repetição</p>
            <div className="flex bg-bg-primary rounded-xl p-1 border border-border">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${recurrenceType === 'indefinite' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`}
                onClick={() => setRecurrenceType('indefinite')}
              >
                Indefinido
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${recurrenceType === 'limited' ? 'bg-accent text-accent-inverse shadow-sm' : 'text-text-secondary'}`}
                onClick={() => setRecurrenceType('limited')}
              >
                Com Limite
              </button>
            </div>

            {recurrenceType === 'limited' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Repetir até</label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={e => setRecurrenceEndDate(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  required={recurrenceType === 'limited'}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-accent text-accent-inverse font-semibold py-4 rounded-2xl text-base transition-colors mt-6 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Atualizar Recorrência'}
          </button>
        </form>
      </div>
    </div>
  );
}
