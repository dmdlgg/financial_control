import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TransactionType, type TransactionStatus } from '../db';
import { format } from 'date-fns';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';

export function AddTransaction() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];

  const existingTransaction = useLiveQuery(
    () => id ? db.transactions.get(id) : undefined,
    [id]
  );

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [blockId, setBlockId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('completed');

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
      await db.transactions.update(id, {
        type,
        amount: parseCurrencyInput(amount),
        categoryId,
        date,
        blockId: blockId || undefined,
        description,
        status
      });
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
    navigate(-1);
  };

  const handleDelete = async () => {
    if (id && confirm('Tem certeza que deseja excluir esta transação?')) {
      await db.transactions.delete(id);
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-slate-900 shadow-2xl sm:border-x sm:border-slate-200 dark:border-slate-800">
      <header className="p-4 flex items-center justify-between bg-white dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{id ? 'Editar Transação' : 'Nova Transação'}</h1>
        </div>
        {id && (
          <button onClick={handleDelete} className="p-2 -mr-2 rounded-full hover:bg-red-500/10 text-red-400 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24">
        {!id && (
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mb-6 border border-slate-200 dark:border-slate-700/50">
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${type === 'expense' ? 'bg-red-500 text-white shadow-md shadow-red-900/20' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
              onClick={() => { setType('expense'); setCategoryId(''); }}
            >
              Despesa
            </button>
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${type === 'income' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/20' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
              onClick={() => { setType('income'); setCategoryId(''); }}
            >
              Renda
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Valor</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={amount} 
              onChange={e => setAmount(formatCurrencyInput(e.target.value))} 
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-slate-100 text-3xl font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
              placeholder="R$ 0,00" 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Descrição (Opcional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ex: Mercado" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none" required>
                <option value="" disabled>Selecione</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required />
            </div>
          </div>

          {type === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Bloco de Orçamento (Opcional)</label>
              <select value={blockId} onChange={e => setBlockId(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none">
                <option value="">Nenhum bloco</option>
                {blocks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Status</label>
            <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50">
              <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'completed' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400'}`} onClick={() => setStatus('completed')}>Realizado</button>
              <button type="button" className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${status === 'planned' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400'}`} onClick={() => setStatus('planned')}>Planejado</button>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-base transition-colors mt-6 shadow-lg shadow-blue-900/20">
            {id ? 'Atualizar Transação' : 'Salvar Transação'}
          </button>
        </form>
      </div>
    </div>
  );
}
