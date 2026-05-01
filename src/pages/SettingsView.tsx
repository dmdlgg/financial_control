import { useState } from 'react';
// ...existing code...
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PeriodType, type TransactionType } from '../db';
import { Plus, Trash2, Sun, Moon } from 'lucide-react';
import { CATEGORY_COLORS } from '../lib/constants';
import { useThemeStore } from '../store/themeStore';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';

export function SettingsView() {
    const handleDeleteBlock = async (id: string) => {
      if (confirm('Tem certeza que deseja excluir este bloco?')) {
        await db.blocks.delete(id);
      }
    };
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const { theme, toggleTheme } = useThemeStore();

  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockAmount, setNewBlockAmount] = useState('');
  const [newBlockPeriod, setNewBlockPeriod] = useState<PeriodType>('monthly');

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockName || !newBlockAmount) return;
    await db.blocks.add({
      id: crypto.randomUUID(),
      name: newBlockName,
      totalAmount: parseCurrencyInput(newBlockAmount),
      period: newBlockPeriod
    });
    setNewBlockName('');
    setNewBlockAmount('');
  };


  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    await db.categories.add({
      id: crypto.randomUUID(),
      name: newCatName,
      type: newCatType,
      color: newCatColor
    });
    setNewCatName('');
    setNewCatColor(CATEGORY_COLORS[0]);
  };

  const handleDeleteCat = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      await db.categories.delete(id);
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Ajustes</h1>
        <button onClick={toggleTheme} className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Blocos Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Blocos de Orçamento</h2>
        <form onSubmit={handleAddBlock} className="bg-slate-100 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 mb-4 space-y-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Nome do Bloco</label>
            <input type="text" value={newBlockName} onChange={e => setNewBlockName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ex: Lazer" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Valor</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={newBlockAmount} 
                onChange={e => setNewBlockAmount(formatCurrencyInput(e.target.value))} 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                placeholder="R$ 0,00" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Período</label>
              <select value={newBlockPeriod} onChange={e => setNewBlockPeriod(e.target.value as PeriodType)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none">
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Adicionar Bloco
          </button>
        </form>

        <ul className="space-y-3">
          {blocks.map(b => (
            <li key={b.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:bg-slate-800/60 transition-colors">
              <div>
                <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">{b.name} <span className="text-slate-400 dark:text-slate-500 text-xs ml-2 font-normal">({b.period === 'monthly' ? 'Mensal' : 'Semanal'})</span></p>
                <p className="text-blue-400 font-medium text-sm mt-0.5">R$ {b.totalAmount.toFixed(2)}</p>
              </div>
              <button onClick={() => handleDeleteBlock(b.id)} className="text-red-400 hover:text-red-300 p-2 rounded-xl bg-red-400/10 hover:bg-red-400/20 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Categorias Section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Categorias</h2>
        <form onSubmit={handleAddCat} className="bg-slate-100 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/50 mb-4 space-y-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Nome da Categoria</label>
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ex: Alimentação" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tipo</label>
            <select value={newCatType} onChange={e => setNewCatType(e.target.value as TransactionType)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none">
              <option value="expense">Despesa</option>
              <option value="income">Renda</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCatColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${newCatColor === color ? 'scale-110 ring-2 ring-slate-900 dark:ring-slate-100 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 mt-2">
            <Plus className="w-5 h-5" /> Adicionar Categoria
          </button>
        </form>

        <ul className="space-y-3">
          {categories.map(c => (
            <li key={c.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:bg-slate-800/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || (c.type === 'income' ? '#10b981' : '#ef4444'), boxShadow: `0 0 8px ${c.color || (c.type === 'income' ? '#10b981' : '#ef4444')}80` }} />
                <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">{c.name}</p>
              </div>
              <button onClick={() => handleDeleteCat(c.id)} className="text-red-400 hover:text-red-300 p-2 rounded-xl bg-red-400/10 hover:bg-red-400/20 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
