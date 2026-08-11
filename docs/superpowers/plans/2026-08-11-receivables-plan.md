# Controle de Pagamentos a Receber — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar uma funcionalidade separada no app para controlar dinheiro a receber, com categorias, devedores, dívidas parceladas, pagamentos e histórico.

**Architecture:** Domínio totalmente separado das finanças principais, com novas tabelas no Dexie (IndexedDB) e novas telas em `/receivables/*`. Lógica de parcelas centralizada em `src/lib/receivables.ts`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Dexie.js, react-router-dom v7, Lucide React, date-fns.

## Global Constraints

- Todos os dados salvos localmente via IndexedDB (Dexie).
- Nenhuma integração com tabelas existentes (`transactions`, `recurringTransactions`, `blocks`, `categories`).
- Estilo visual segue padrão atual: cards `rounded-3xl`, fundo slate, ícones Lucide.
- Cor temática: azul/índigo para dinheiro a receber.
- Build deve passar sem erros TypeScript (`npm run build`).
- Commits frequentes, uma task por commit.

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/db/index.ts` | Adicionar interfaces e tabelas novas do domínio "a receber" |
| `src/App.tsx` | Registrar rotas `/receivables/*` |
| `src/components/Layout.tsx` | Adicionar aba inferior "A Receber" com badge condicional |
| `src/lib/receivables.ts` | Funções utilitárias: gerar parcelas, recalcular valores, verificar fim de mês |
| `src/pages/ReceivablesDashboard.tsx` | Lista de categorias + resumo geral |
| `src/pages/ReceivablesCategory.tsx` | Lista de devedores da categoria + resumo da categoria |
| `src/pages/ReceivablesDebtor.tsx` | Lista de dívidas do devedor + resumo do devedor |
| `src/pages/ReceivablesDebt.tsx` | Parcelas da dívida por mês + pagamento |
| `src/pages/ReceivablesHistory.tsx` | Dívidas quitadas |
| `src/pages/ReceivablesNewCategory.tsx` | Criar/editar categoria |
| `src/pages/ReceivablesNewDebtor.tsx` | Criar/editar devedor |
| `src/pages/ReceivablesNewDebt.tsx` | Criar/editar dívida |

---

### Task 1: Estrutura de dados no Dexie

**Files:**
- Modify: `src/db/index.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: tipos `ReceivableCategory`, `ReceivableDebtor`, `ReceivableDebt`, `ReceivableInstallment`, `ReceivableSettledDebt`; tabelas `receivableCategories`, `receivableDebtors`, `receivableDebts`, `receivableInstallments`, `receivableSettledDebts`.

- [ ] **Step 1: Adicionar interfaces acima do objeto `db`**

```ts
export interface ReceivableCategory {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface ReceivableDebtor {
  id: string;
  categoryId: string;
  name: string;
}

export interface ReceivableDebt {
  id: string;
  debtorId: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  installmentsCount: number;
  startMonth: string;
  createdAt: string;
  settledAt?: string;
}

export interface ReceivableInstallment {
  id: string;
  debtId: string;
  month: string;
  number: number;
  expectedAmount: number;
  paidAmount?: number;
  paidAt?: string;
  status: 'pending' | 'paid' | 'partial';
}

export interface ReceivableSettledDebt {
  id: string;
  categoryId: string;
  debtorId: string;
  description: string;
  totalAmount: number;
  settledAt: string;
  installmentsCount: number;
}
```

- [ ] **Step 2: Atualizar tipagem do objeto `db`**

```ts
const db = new Dexie('ControleFinanceiroDB') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  blocks: EntityTable<Block, 'id'>;
  categories: EntityTable<Category, 'id'>;
  recurringTransactions: EntityTable<RecurringTransaction, 'id'>;
  receivableCategories: EntityTable<ReceivableCategory, 'id'>;
  receivableDebtors: EntityTable<ReceivableDebtor, 'id'>;
  receivableDebts: EntityTable<ReceivableDebt, 'id'>;
  receivableInstallments: EntityTable<ReceivableInstallment, 'id'>;
  receivableSettledDebts: EntityTable<ReceivableSettledDebt, 'id'>;
};
```

- [ ] **Step 3: Subir versão do schema e declarar índices**

```ts
db.version(4).stores({
  transactions: 'id, type, categoryId, date, blockId, status, recurrenceId',
  blocks: 'id, name, period, order',
  categories: 'id, name, type',
  recurringTransactions: 'id, type, categoryId, startDate, status, recurrenceType',
  receivableCategories: 'id, name',
  receivableDebtors: 'id, categoryId, name',
  receivableDebts: 'id, debtorId, settledAt',
  receivableInstallments: 'id, debtId, month, status',
  receivableSettledDebts: 'id, categoryId, debtorId, settledAt'
});
```

- [ ] **Step 4: Verificar TypeScript**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/db/index.ts
git commit -m "feat: add receivables tables to Dexie schema"
```

---

### Task 2: Utilitários de parcelas

**Files:**
- Create: `src/lib/receivables.ts`

**Interfaces:**
- Consumes: tipos de `src/db/index.ts`.
- Produces: `generateInstallments(debt)`, `recalculateFutureInstallments(debtId)`, `hasPendingMonthEndInstallments()`, `formatMonth(month)`, `addMonthsToString(month, n)`.

- [ ] **Step 1: Criar arquivo com funções de geração de parcelas**

```ts
import { db, type ReceivableDebt, type ReceivableInstallment } from '../db';

export function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function addMonthsToString(month: string, n: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + n, 1);
  return formatMonth(date);
}

export function calculateInstallmentAmounts(total: number, count: number): number[] {
  const base = Math.floor((total / count) * 100) / 100;
  const amounts: number[] = Array(count).fill(base);
  const diff = Math.round((total - base * count) * 100) / 100;
  if (diff !== 0) {
    amounts[count - 1] = Math.round((base + diff) * 100) / 100;
  }
  return amounts;
}

export async function generateInstallments(debt: ReceivableDebt): Promise<void> {
  const amounts = calculateInstallmentAmounts(debt.totalAmount, debt.installmentsCount);
  const installments: ReceivableInstallment[] = amounts.map((amount, i) => ({
    id: crypto.randomUUID(),
    debtId: debt.id,
    month: addMonthsToString(debt.startMonth, i),
    number: i + 1,
    expectedAmount: amount,
    status: 'pending'
  }));
  await db.receivableInstallments.bulkAdd(installments);
}

export async function recalculateFutureInstallments(debtId: string, fromMonth: string): Promise<void> {
  const debt = await db.receivableDebts.get(debtId);
  if (!debt) return;

  const installments = await db.receivableInstallments
    .where('debtId')
    .equals(debtId)
    .sortBy('month');

  const futurePending = installments.filter(
    i => i.month > fromMonth && i.status === 'pending'
  );

  if (futurePending.length === 0) return;

  const amounts = calculateInstallmentAmounts(debt.remainingAmount, futurePending.length);
  await Promise.all(
    futurePending.map((inst, i) =>
      db.receivableInstallments.update(inst.id, { expectedAmount: amounts[i] })
    )
  );
}

export async function settleDebtIfNeeded(debtId: string): Promise<boolean> {
  const debt = await db.receivableDebts.get(debtId);
  if (!debt || debt.remainingAmount > 0) return false;

  const now = new Date().toISOString();
  await db.receivableDebts.update(debtId, { settledAt: now });

  const debtor = await db.receivableDebtors.get(debt.debtorId);
  if (debtor) {
    await db.receivableSettledDebts.put({
      id: debt.id,
      categoryId: debtor.categoryId,
      debtorId: debtor.id,
      description: debt.description,
      totalAmount: debt.totalAmount,
      settledAt: now,
      installmentsCount: debt.installmentsCount
    });
  }
  return true;
}

export async function hasPendingMonthEndInstallments(): Promise<boolean> {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft = Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft > 5) return false;

  const currentMonth = formatMonth(today);
  const pending = await db.receivableInstallments
    .where('month')
    .equals(currentMonth)
    .and(i => i.status === 'pending' || i.status === 'partial')
    .count();
  return pending > 0;
}
```

- [ ] **Step 2: Verificar TypeScript**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/receivables.ts
git commit -m "feat: add receivables utility functions"
```

---

### Task 3: Rotas e navegação

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: nenhuma.
- Produces: rotas `/receivables`, `/receivables/category/:id`, `/receivables/debtor/:id`, `/receivables/debt/:id`, `/receivables/history`, `/receivables/new-category`, `/receivables/new-debtor`, `/receivables/new-debt`; aba inferior "A Receber".

- [ ] **Step 1: Importar páginas novas em `src/App.tsx`**

```ts
import { ReceivablesDashboard } from './pages/ReceivablesDashboard';
import { ReceivablesCategory } from './pages/ReceivablesCategory';
import { ReceivablesDebtor } from './pages/ReceivablesDebtor';
import { ReceivablesDebt } from './pages/ReceivablesDebt';
import { ReceivablesHistory } from './pages/ReceivablesHistory';
import { ReceivablesNewCategory } from './pages/ReceivablesNewCategory';
import { ReceivablesNewDebtor } from './pages/ReceivablesNewDebtor';
import { ReceivablesNewDebt } from './pages/ReceivablesNewDebt';
```

- [ ] **Step 2: Adicionar rotas dentro do `BrowserRouter`**

```tsx
<Route path="/receivables" element={<Layout />}>
  <Route index element={<ReceivablesDashboard />} />
  <Route path="category/:id" element={<ReceivablesCategory />} />
  <Route path="debtor/:id" element={<ReceivablesDebtor />} />
  <Route path="debt/:id" element={<ReceivablesDebt />} />
  <Route path="history" element={<ReceivablesHistory />} />
  <Route path="new-category" element={<ReceivablesNewCategory />} />
  <Route path="new-debtor" element={<ReceivablesNewDebtor />} />
  <Route path="new-debt" element={<ReceivablesNewDebt />} />
</Route>
```

- [ ] **Step 3: Adicionar item na aba inferior em `src/components/Layout.tsx`**

Importar ícone: `import { Wallet } from 'lucide-react';`.

Atualizar `navItems`:

```ts
const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { path: '/charts', icon: PieChart, label: 'Gráficos' },
  { path: '/receivables', icon: Wallet, label: 'A Receber' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];
```

- [ ] **Step 4: Verificar TypeScript**

Run: `npm run build`
Expected: pode haver erros temporários porque as páginas ainda não foram criadas. Se houver, prossiga para as próximas tasks e rode o build novamente ao final.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "feat: add receivables routes and bottom navigation"
```

---

### Task 4: Tela principal de categorias

**Files:**
- Create: `src/pages/ReceivablesDashboard.tsx`

**Interfaces:**
- Consumes: `db.receivableCategories`, `db.receivableDebtors`, `db.receivableDebts`.
- Produces: tela `/receivables` com lista de categorias, resumo geral e link para histórico.

- [ ] **Step 1: Criar componente listando categorias**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Wallet, ChevronRight, History } from 'lucide-react';

export function ReceivablesDashboard() {
  const navigate = useNavigate();
  const categories = useLiveQuery(() => db.receivableCategories.toArray()) || [];
  const debtors = useLiveQuery(() => db.receivableDebtors.toArray()) || [];
  const debts = useLiveQuery(() => db.receivableDebts.toArray()) || [];

  const totalRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">A Receber</h1>
        <button onClick={() => navigate('/receivables/history')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <History className="w-5 h-5" />
        </button>
      </header>

      <div className="bg-blue-500/10 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 p-5 rounded-3xl mb-6">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total a receber</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">R$ {totalRemaining.toFixed(2)}</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Categorias</h2>
      </div>

      {categories.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
          <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhuma categoria criada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {categories.map(cat => {
            const catDebtorIds = debtors.filter(d => d.categoryId === cat.id).map(d => d.id);
            const catRemaining = debts.filter(d => catDebtorIds.includes(d.debtorId)).reduce((sum, d) => sum + d.remainingAmount, 0);
            return (
              <li
                key={cat.id}
                onClick={() => navigate(`/receivables/category/${cat.id}`)}
                className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5" style={{ color: cat.color || '#3b82f6' }} />
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold">{cat.name}</p>
                    <p className="text-xs text-blue-500 font-medium mt-0.5">R$ {catRemaining.toFixed(2)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar renderização**

Run: `npm run dev`
Acesse `/receivables`. Verifique que a tela carrega e mostra "Nenhuma categoria criada".

- [ ] **Step 3: Commit**

```bash
git add src/pages/ReceivablesDashboard.tsx
git commit -m "feat: add receivables dashboard screen"
```

---

### Task 5: CRUD de categoria

**Files:**
- Create: `src/pages/ReceivablesNewCategory.tsx`

**Interfaces:**
- Consumes: `db.receivableCategories`.
- Produces: tela `/receivables/new-category` com formulário para criar/editar categoria.

- [ ] **Step 1: Criar formulário de categoria**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';
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

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-slate-900">
      <header className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1>{id ? 'Editar Categoria' : 'Nova Categoria'}</h1>
      </header>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" required />
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} style={{ backgroundColor: c }} className={`w-8 h-8 rounded-full ${color === c ? 'ring-2' : ''}`} />
          ))}
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-2xl">Salvar</button>
      </form>
    </div>
  );
}
```

**Nota:** o exemplo acima é esqueleto. Ajustar classes Tailwind para manter consistência visual com `SettingsView`.

- [ ] **Step 2: Adicionar FAB na tela de categorias apontando para `/receivables/new-category`**

Modificar `ReceivablesDashboard.tsx` incluindo um FAB azul no canto inferior direito.

- [ ] **Step 3: Verificar criação de categoria**

Run: `npm run dev`
Crie uma categoria "Cartão Nubank" e verifique se aparece na lista.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ReceivablesNewCategory.tsx src/pages/ReceivablesDashboard.tsx
git commit -m "feat: add receivable category CRUD"
```

---

### Task 6: Tela de devedores

**Files:**
- Create: `src/pages/ReceivablesCategory.tsx`

**Interfaces:**
- Consumes: `db.receivableCategories`, `db.receivableDebtors`, `db.receivableDebts`.
- Produces: tela `/receivables/category/:id` listando devedores com total por devedor.

- [ ] **Step 1: Criar tela de devedores**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { ArrowLeft, ChevronRight, User } from 'lucide-react';

export function ReceivablesCategory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const category = useLiveQuery(() => id ? db.receivableCategories.get(id) : undefined, [id]);
  const debtors = useLiveQuery(() => id ? db.receivableDebtors.where('categoryId').equals(id).toArray() : [], [id]);
  const debts = useLiveQuery(() => db.receivableDebts.toArray()) || [];

  const totalRemaining = debts
    .filter(d => debtors?.some(debtor => debtor.id === d.debtorId))
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1 className="text-2xl font-bold">{category?.name || 'Categoria'}</h1>
      </header>

      <div className="bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 p-5 rounded-3xl mb-6">
        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase">Total da categoria</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">R$ {totalRemaining.toFixed(2)}</p>
      </div>

      {debtors?.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhum devedor cadastrado.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {debtors?.map(debtor => {
            const debtorDebts = debts.filter(d => d.debtorId === debtor.id);
            const remaining = debtorDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
            return (
              <li
                key={debtor.id}
                onClick={() => navigate(`/receivables/debtor/${debtor.id}`)}
                className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{debtor.name}</p>
                    <p className="text-xs text-blue-500 font-medium">R$ {remaining.toFixed(2)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ReceivablesCategory.tsx
git commit -m "feat: add receivable debtors list screen"
```

---

### Task 7: CRUD de devedor

**Files:**
- Create: `src/pages/ReceivablesNewDebtor.tsx`

**Interfaces:**
- Consumes: `db.receivableDebtors`, `categoryId` via query param.
- Produces: tela `/receivables/new-debtor` para criar/editar devedor.

- [ ] **Step 1: Criar formulário de devedor**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';

export function ReceivablesNewDebtor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId') || '';
  const existing = useLiveQuery(() => id ? db.receivableDebtors.get(id) : undefined, [id]);

  const [name, setName] = useState('');

  useEffect(() => {
    if (existing) setName(existing.name);
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (id) {
      await db.receivableDebtors.update(id, { name });
    } else {
      await db.receivableDebtors.add({
        id: crypto.randomUUID(),
        categoryId,
        name
      });
    }
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-slate-900">
      <header className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1>{id ? 'Editar Devedor' : 'Novo Devedor'}</h1>
      </header>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" required />
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-2xl">Salvar</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar FAB em `ReceivablesCategory.tsx` para `/receivables/new-debtor?categoryId=${id}`**

- [ ] **Step 3: Verificar criação de devedor**

Run: `npm run dev`
Crie devedor "Fulano X" dentro de "Cartão Nubank".

- [ ] **Step 4: Commit**

```bash
git add src/pages/ReceivablesNewDebtor.tsx src/pages/ReceivablesCategory.tsx
git commit -m "feat: add receivable debtor CRUD"
```

---

### Task 8: Tela de dívidas

**Files:**
- Create: `src/pages/ReceivablesDebtor.tsx`

**Interfaces:**
- Consumes: `db.receivableDebtors`, `db.receivableDebts`, `db.receivableCategories`.
- Produces: tela `/receivables/debtor/:id` listando dívidas do devedor.

- [ ] **Step 1: Criar tela de dívidas**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export function ReceivablesDebtor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const debtor = useLiveQuery(() => id ? db.receivableDebtors.get(id) : undefined, [id]);
  const category = useLiveQuery(() => debtor ? db.receivableCategories.get(debtor.categoryId) : undefined, [debtor]);
  const debts = useLiveQuery(() => id ? db.receivableDebts.where('debtorId').equals(id).toArray() : [], [id]);

  const totalRemaining = debts?.reduce((sum, d) => sum + d.remainingAmount, 0) || 0;

  return (
    <div className="p-4 sm:p-6 pb-24">
      <header className="mb-6">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1 className="text-2xl font-bold mt-2">{debtor?.name || 'Devedor'}</h1>
        <p className="text-sm text-slate-500">{category?.name}</p>
      </header>

      <div className="bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 p-5 rounded-3xl mb-6">
        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase">Total do devedor</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">R$ {totalRemaining.toFixed(2)}</p>
      </div>

      {debts?.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border border-dashed">
          <p className="text-slate-400 text-sm">Nenhuma dívida cadastrada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {debts?.map(debt => (
            <li
              key={debt.id}
              onClick={() => navigate(`/receivables/debt/${debt.id}`)}
              className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{debt.description}</p>
                <p className="text-xs text-slate-500">{debt.installmentsCount} parcelas · R$ {debt.remainingAmount.toFixed(2)} restantes</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-500">R$ {debt.remainingAmount.toFixed(2)}</p>
                <ChevronRight className="w-5 h-5 text-slate-400 inline-block" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ReceivablesDebtor.tsx
git commit -m "feat: add receivable debts list screen"
```

---

### Task 9: CRUD de dívida

**Files:**
- Create: `src/pages/ReceivablesNewDebt.tsx`

**Interfaces:**
- Consumes: `db.receivableDebts`, `db.receivableDebtors`, debtorId via query param.
- Produces: tela `/receivables/new-debt` para criar/editar dívida e gerar parcelas.

- [ ] **Step 1: Criar formulário de dívida**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';
import { formatMonth, generateInstallments } from '../lib/receivables';

export function ReceivablesNewDebt() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const debtorId = searchParams.get('debtorId') || '';
  const existing = useLiveQuery(() => id ? db.receivableDebts.get(id) : undefined, [id]);

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [startMonth, setStartMonth] = useState(formatMonth(new Date()));

  useEffect(() => {
    if (existing) {
      setDescription(existing.description);
      setTotalAmount(existing.totalAmount.toFixed(2).replace(/\D/g, ''));
      setInstallmentsCount(String(existing.installmentsCount));
      setStartMonth(existing.startMonth);
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !totalAmount || !installmentsCount || !debtorId) return;

    const amount = parseCurrencyInput(totalAmount);
    const count = parseInt(installmentsCount, 10);

    if (id) {
      await db.receivableDebts.update(id, {
        description,
        totalAmount: amount,
        installmentsCount: count,
        startMonth
      });
    } else {
      const debtId = crypto.randomUUID();
      const debt = {
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

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-slate-900">
      <header className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1>{id ? 'Editar Dívida' : 'Nova Dívida'}</h1>
      </header>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição" required />
        <input inputMode="numeric" value={totalAmount} onChange={e => setTotalAmount(formatCurrencyInput(e.target.value))} placeholder="Valor total" required />
        <input inputMode="numeric" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value.replace(/\D/g, ''))} placeholder="Nº parcelas" required />
        <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} required />
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-2xl">Salvar</button>
      </form>
    </div>
  );
}
```

**Nota sobre edição de dívida:** se a dívida já possuir parcelas pagas, permitir editar apenas a `description`. Alterar valor total, número de parcelas ou mês de início após pagamentos geraria inconsistências. Para renegociar uma dívida, o usuário deve excluir a dívida atual e criar uma nova.

- [ ] **Step 2: Adicionar FAB em `ReceivablesDebtor.tsx` para `/receivables/new-debt?debtorId=${id}`**

- [ ] **Step 3: Verificar criação de dívida parcelada**

Run: `npm run dev`
Crie dívida "Compra parcelada" de R$ 1.000,00 em 10x, início no mês atual. Verifique se as parcelas foram geradas.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ReceivablesNewDebt.tsx src/pages/ReceivablesDebtor.tsx
git commit -m "feat: add receivable debt CRUD with installment generation"
```

---

### Task 10: Tela de parcelas e pagamento

**Files:**
- Create: `src/pages/ReceivablesDebt.tsx`

**Interfaces:**
- Consumes: `db.receivableDebts`, `db.receivableInstallments`, `db.receivableDebtors`, `db.receivableCategories`; funções `recalculateFutureInstallments`, `settleDebtIfNeeded`, `formatMonth`, `addMonthsToString`.
- Produces: tela `/receivables/debt/:id` com seletor de mês, lista de parcelas, modal de pagamento.

- [ ] **Step 1: Criar tela com seletor de mês e lista de parcelas**

Implementar componente similar ao Dashboard com `currentDate` controlado por mês/ano. Filtrar parcelas por `debtId` e `month`.

```tsx
const installments = useLiveQuery(
  () => db.receivableInstallments.where({ debtId: id, month: formatMonth(currentDate) }).toArray(),
  [id, currentDate]
);
```

- [ ] **Step 2: Implementar modal de pagamento**

Ao tocar no check de uma parcela pendente ou parcial, abrir modal com input de valor (default = `expectedAmount - (paidAmount || 0)`).

```ts
const remainingOnInstallment = installment.expectedAmount - (installment.paidAmount || 0);
const newPayment = parseCurrencyInput(paymentInput);
const newPaidAmount = (installment.paidAmount || 0) + newPayment;
const excess = Math.max(0, newPaidAmount - installment.expectedAmount);
const effectivePayment = newPayment - excess;

await db.receivableInstallments.update(installment.id, {
  paidAmount: newPaidAmount,
  paidAt: new Date().toISOString(),
  status: newPaidAmount >= installment.expectedAmount ? 'paid' : 'partial'
});

await db.receivableDebts.update(debt.id, {
  remainingAmount: Math.max(0, debt.remainingAmount - effectivePayment)
});

await recalculateFutureInstallments(debt.id, installment.month);
await settleDebtIfNeeded(debt.id);
```

- [ ] **Step 3: Exibir parcela riscada quando paga**

```tsx
<li className={installment.status === 'paid' ? 'line-through opacity-60' : ''}>
  ...
</li>
```

- [ ] **Step 4: Verificar pagamento**

Run: `npm run dev`
Marque uma parcela como paga. Verifique se `remainingAmount` diminuiu e parcelas futuras foram recalculadas.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ReceivablesDebt.tsx
git commit -m "feat: add installment payment screen"
```

---

### Task 11: Histórico de dívidas quitadas

**Files:**
- Create: `src/pages/ReceivablesHistory.tsx`

**Interfaces:**
- Consumes: `db.receivableSettledDebts`, `db.receivableCategories`, `db.receivableDebtors`.
- Produces: tela `/receivables/history` agrupando dívidas quitadas.

- [ ] **Step 1: Criar tela de histórico**

```tsx
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
```

- [ ] **Step 2: Verificar histórico**

Run: `npm run dev`
Quite uma dívida e verifique se aparece no histórico.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ReceivablesHistory.tsx
git commit -m "feat: add settled debts history screen"
```

---

### Task 12: Badge e banner de fim de mês

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/pages/ReceivablesDashboard.tsx`

**Interfaces:**
- Consumes: `hasPendingMonthEndInstallments()`.
- Produces: badge na aba inferior e banner na tela principal.

- [ ] **Step 1: Adicionar badge na aba inferior**

Em `Layout.tsx`, usar `useLiveQuery` com `hasPendingMonthEndInstallments()` e renderizar ponto vermelho quando true.

```tsx
const showBadge = useLiveQuery(hasPendingMonthEndInstallments, []);
```

Condicional no item "A Receber":

```tsx
{showBadge && <span className="absolute top-1 right-4 w-2 h-2 bg-red-500 rounded-full" />}
```

- [ ] **Step 2: Adicionar banner na tela principal**

No componente `ReceivablesDashboard`, adicionar:

```tsx
const [dismissedBanner, setDismissedBanner] = useState(false);
const showBanner = useLiveQuery(hasPendingMonthEndInstallments, []);
```

Renderizar condicionalmente:

```tsx
{showBanner && !dismissedBanner && (
  <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 p-4 rounded-2xl mb-6">
    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Há parcelas deste mês ainda não confirmadas. Já recebeu?</p>
    <div className="flex gap-2 mt-3">
      <button onClick={() => navigate('/receivables')} className="...">Ver parcelas</button>
      <button onClick={() => setDismissedBanner(true)} className="...">Depois</button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Testar banner/badge**

Run: `npm run dev`
Crie uma dívida com parcela no mês atual. Verifique se badge aparece nos últimos 5 dias do mês. Para testar fora do período, ajustar temporariamente a constante de 5 dias no utilitário.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx src/pages/ReceivablesDashboard.tsx
git commit -m "feat: add month-end reminder badge and banner"
```

---

### Task 13: Polimento visual e verificação final

**Files:**
- Modify: todos os arquivos criados nas tasks anteriores (ajustes de classes Tailwind, consistência).

- [ ] **Step 1: Revisar consistência visual**

Garantir que todos os inputs usem `bg-white dark:bg-slate-900`, bordas `rounded-2xl`, etc. Alinhar headers com padrão do `AddTransaction`.

- [ ] **Step 2: Verificar TypeScript**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Verificar fluxo completo**

Run: `npm run dev`
Teste:
1. Criar categoria.
2. Criar devedor.
3. Criar dívida parcelada.
4. Pagar uma parcela.
5. Pagar a mais em outra parcela e verificar recálculo.
6. Pagar todas as parcelas e verificar histórico.

- [ ] **Step 4: Commit final**

```bash
git commit -am "feat: finish receivables feature"
```

---

## Spec Coverage Check

| Requisito do spec | Task |
|-------------------|------|
| Tabelas novas no Dexie | Task 1 |
| Geração automática de parcelas | Task 2, Task 9 |
| Categorias e resumo geral | Task 4, Task 5 |
| Devedores e resumo por categoria | Task 6, Task 7 |
| Dívidas e resumo por devedor | Task 8, Task 9 |
| Parcelas por mês e pagamento | Task 2, Task 10 |
| Reajuste automático | Task 2, Task 10 |
| Quitação e histórico | Task 2, Task 11 |
| Badge e banner | Task 12 |
| Separação do app principal | Todas as tasks usam tabelas novas |

## Placeholder Scan

Nenhum TBD/TODO no plano. Todos os snippets de código são implementáveis diretamente.

## Type Consistency Check

- Propriedades dos tipos em `src/db/index.ts` combinam com uso nas páginas.
- Funções `generateInstallments`, `recalculateFutureInstallments`, `settleDebtIfNeeded`, `hasPendingMonthEndInstallments` usam os tipos exportados.
- Query params (`categoryId`, `debtorId`) são strings.
