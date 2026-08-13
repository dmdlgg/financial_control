import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PeriodType, type TransactionType, type Block } from '../db';
import { Plus, Trash2, Sun, Moon, Pencil, Check, X, Download, Upload } from 'lucide-react';
import { CATEGORY_COLORS } from '../lib/constants';
import { useThemeStore } from '../store/themeStore';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';

export function SettingsView() {
    const handleDeleteBlock = async (id: string) => {
      if (confirm('Tem certeza que deseja excluir este bloco?')) {
        await db.blocks.delete(id);
      }
    };

    const startEdit = (block: Block) => {
      setEditingBlockId(block.id);
      setEditName(block.name);
      setEditAmount(formatCurrencyInput(block.totalAmount.toFixed(2).replace(/\D/g, '')));
      setEditPeriod(block.period);
    };

    const cancelEdit = () => {
      setEditingBlockId(null);
      setEditName('');
      setEditAmount('');
      setEditPeriod('monthly');
    };

    const saveEdit = async (id: string) => {
      if (!editName || !editAmount) return;
      await db.blocks.update(id, {
        name: editName,
        totalAmount: parseCurrencyInput(editAmount),
        period: editPeriod,
      });
      setEditingBlockId(null);
    };

    const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const { theme, toggleTheme } = useThemeStore();

  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockAmount, setNewBlockAmount] = useState('');
  const [newBlockPeriod, setNewBlockPeriod] = useState<PeriodType>('monthly');

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPeriod, setEditPeriod] = useState<PeriodType>('monthly');

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const exportData = async () => {
    const [transactions, blocks, categories, recurringTransactions] = await Promise.all([
      db.transactions.toArray(),
      db.blocks.toArray(),
      db.categories.toArray(),
      db.recurringTransactions.toArray(),
    ]);

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      blocks,
      categories,
      recurringTransactions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `controle-financeiro-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.transactions || !data.blocks || !data.categories) {
        alert('Arquivo de backup inválido.');
        return;
      }

      if (!confirm('Isso substituirá todos os dados atuais. Deseja continuar?')) {
        return;
      }

      await db.transaction('rw', db.transactions, db.blocks, db.categories, db.recurringTransactions, async () => {
        await db.transactions.clear();
        await db.blocks.clear();
        await db.categories.clear();
        await db.recurringTransactions.clear();

        if (data.transactions.length) await db.transactions.bulkAdd(data.transactions);
        if (data.blocks.length) await db.blocks.bulkAdd(data.blocks);
        if (data.categories.length) await db.categories.bulkAdd(data.categories);
        if (data.recurringTransactions?.length) await db.recurringTransactions.bulkAdd(data.recurringTransactions);
      });

      alert('Dados importados com sucesso!');
    } catch (err) {
      alert('Erro ao importar: ' + (err instanceof Error ? err.message : 'desconhecido'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 bg-bg-primary">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Ajustes</h1>
        <button onClick={toggleTheme} className="p-2 rounded-xl bg-bg-elevated text-text-secondary hover:bg-bg-surface transition-colors flex items-center gap-2">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Blocos Section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Blocos de Orçamento</h2>
        <form onSubmit={handleAddBlock} className="bg-bg-elevated border-border p-5 rounded-3xl space-y-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Nome do Bloco</label>
            <input type="text" value={newBlockName} onChange={e => setNewBlockName(e.target.value)} className="w-full bg-bg-surface border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" placeholder="Ex: Lazer" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Valor</label>
              <input
                type="text"
                inputMode="numeric"
                value={newBlockAmount}
                onChange={e => setNewBlockAmount(formatCurrencyInput(e.target.value))}
                className="w-full bg-bg-surface border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="R$ 0,00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Período</label>
              <select value={newBlockPeriod} onChange={e => setNewBlockPeriod(e.target.value as PeriodType)} className="w-full bg-bg-surface border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none">
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-accent text-accent-inverse hover:opacity-90 active:opacity-80 font-semibold py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Adicionar Bloco
          </button>
        </form>

        <ul className="space-y-3">
          {blocks.map(b => (
            <li key={b.id} className="bg-bg-elevated p-4 rounded-2xl border border-border transition-colors">
              {editingBlockId === b.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    placeholder="Nome do bloco"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editAmount}
                      onChange={e => setEditAmount(formatCurrencyInput(e.target.value))}
                      className="w-full bg-bg-surface border border-border rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                      placeholder="R$ 0,00"
                    />
                    <select
                      value={editPeriod}
                      onChange={e => setEditPeriod(e.target.value as PeriodType)}
                      className="w-full bg-bg-surface border border-border rounded-xl p-2.5 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(b.id)}
                      className="flex-1 bg-accent text-accent-inverse py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Salvar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-bg-surface text-text-primary border border-border py-2 rounded-xl text-sm font-semibold hover:bg-bg-elevated transition-colors flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-primary text-sm font-semibold">{b.name} <span className="text-text-secondary text-xs ml-2 font-normal">({b.period === 'monthly' ? 'Mensal' : 'Semanal'})</span></p>
                    <p className="text-accent font-medium text-sm mt-0.5">{formatCurrencyInput(Math.round(b.totalAmount * 100).toString())}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(b)} className="text-text-secondary hover:text-text-primary p-2 rounded-xl hover:bg-bg-surface transition-colors">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteBlock(b.id)} className="text-danger hover:text-red-300 p-2 rounded-xl bg-danger/10 hover:bg-danger/20 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Categorias Section */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Categorias</h2>
        <form onSubmit={handleAddCat} className="bg-bg-elevated border-border p-5 rounded-3xl space-y-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Nome da Categoria</label>
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-bg-surface border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" placeholder="Ex: Alimentação" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Tipo</label>
            <select value={newCatType} onChange={e => setNewCatType(e.target.value as TransactionType)} className="w-full bg-bg-surface border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none">
              <option value="expense">Despesa</option>
              <option value="income">Renda</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Cor</label>
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
          <button type="submit" className="w-full bg-accent text-accent-inverse hover:opacity-90 active:opacity-80 font-semibold py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 mt-2">
            <Plus className="w-5 h-5" /> Adicionar Categoria
          </button>
        </form>

        <ul className="space-y-3">
          {categories.map(c => (
            <li key={c.id} className="bg-bg-elevated border-border p-4 rounded-2xl transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || (c.type === 'income' ? '#10b981' : '#ef4444') }} />
                <p className="text-text-primary text-sm font-semibold">{c.name}</p>
              </div>
              <button onClick={() => handleDeleteCat(c.id)} className="text-danger hover:text-red-300 p-2 rounded-xl bg-danger/10 hover:bg-danger/20 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Backup Section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Backup</h2>
        <div className="bg-bg-elevated border-border p-5 rounded-3xl space-y-4 shadow-sm">
          <p className="text-sm text-text-secondary">
            Exporte seus dados para transferir para outro dispositivo. No novo aparelho, use Importar e selecione o arquivo.
          </p>
          <div className="flex gap-3">
            <button
              onClick={exportData}
              className="flex-1 bg-accent text-accent-inverse hover:opacity-90 active:opacity-80 font-semibold py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Exportar dados
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 bg-bg-surface text-text-primary border border-border hover:bg-bg-elevated font-semibold py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" /> Importar dados
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={importData}
            className="hidden"
          />
        </div>
      </section>
    </div>
  );
}
