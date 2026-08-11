import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { CATEGORY_COLORS } from '../lib/constants';

export function ReceivablesNewCategory() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const existing = useLiveQuery(
    () => id ? db.receivableCategories.get(id) : undefined,
    [id]
  );

  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setColor(existing.color || CATEGORY_COLORS[0]);
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (id) {
      await db.receivableCategories.update(id, { name, color });
    } else {
      await db.receivableCategories.add({
        id: crypto.randomUUID(),
        name,
        color,
        createdAt: new Date().toISOString()
      });
    }

    navigate('/receivables');
  };

  const handleDelete = async () => {
    if (id && confirm('Tem certeza que deseja excluir esta categoria?')) {
      await db.receivableCategories.delete(id);
      navigate('/receivables');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center justify-between bg-bg-primary sticky top-0 z-10 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">
            {id ? 'Editar Categoria' : 'Nova Categoria'}
          </h1>
        </div>
        {id && (
          <button
            onClick={handleDelete}
            className="p-2 -mr-2 rounded-full hover:bg-danger/10 text-danger transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
              Nome da Categoria
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded-2xl p-3 text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="Ex: Cartão Nubank"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
              Cor
            </label>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-full transition-transform ${
                    color === c
                      ? 'scale-110 ring-2 ring-text-primary ring-offset-2 ring-offset-bg-primary'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-accent text-accent-inverse font-semibold py-4 rounded-2xl text-base transition-colors mt-6 hover:opacity-90"
          >
            {id ? 'Atualizar Categoria' : 'Salvar Categoria'}
          </button>
        </form>
      </div>
    </div>
  );
}
