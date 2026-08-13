# Visual Identity, Block Editing & Month Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a premium monochrome visual identity, add inline block editing in Settings, and keep the selected month synchronized across views during the app session.

**Architecture:** A single Zustand store holds the session-month. All month-bearing views read from it. The theme is implemented through Tailwind v4 `@theme` CSS custom properties that swap under `.dark`. Inline block editing keeps UI state local to `SettingsView` and writes to Dexie.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand, Dexie, date-fns, lucide-react.

## Global Constraints

- Keep functional colors: emerald-500 for income, red-500 for expenses, purple for planned.
- Keep `CATEGORY_COLORS` unchanged.
- No persistent storage for month; survive only until app close.
- Prefer solid colors over opacity (`/60`, `/50`) and remove colored glows.
- Follow existing file patterns; do not create new routes or pages.
- Currency formatting/parsing must use existing `formatCurrencyInput` / `parseCurrencyInput`.

---

## File Map

| File | Responsibility | Action |
|---|---|---|
| `src/store/monthStore.ts` | Session-level selected month | Create |
| `src/index.css` | Theme tokens and base layer | Modify |
| `src/components/Layout.tsx` | App shell, nav, FAB | Modify |
| `src/pages/Dashboard.tsx` | Overview, month nav, blocks, recent transactions | Modify |
| `src/pages/CalendarView.tsx` | Calendar grid and day details | Modify |
| `src/pages/BlockDetails.tsx` | Block detail per month | Modify |
| `src/pages/AddTransaction.tsx` | Transaction form | Modify |
| `src/pages/TransactionListView.tsx` | Transaction list by type/month | Modify |
| `src/pages/SettingsView.tsx` | Settings, block/category management, inline block edit | Modify |

---

### Task 1: Create the month store

**Files:**
- Create: `src/store/monthStore.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `useMonthStore` with `currentDate: Date`, `setCurrentDate`, `goToPreviousMonth`, `goToNextMonth`.

- [ ] **Step 1: Write the store**

Create `src/store/monthStore.ts`:

```ts
import { create } from 'zustand';
import { addMonths, subMonths } from 'date-fns';

interface MonthState {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

export const useMonthStore = create<MonthState>((set) => ({
  currentDate: new Date(),
  setCurrentDate: (date) => set({ currentDate: date }),
  goToPreviousMonth: () => set((state) => ({
    currentDate: subMonths(state.currentDate, 1),
  })),
  goToNextMonth: () => set((state) => ({
    currentDate: addMonths(state.currentDate, 1),
  })),
}));
```

- [ ] **Step 2: Register store by importing it (hot-reload sanity check)**

Modify `src/App.tsx` to import the store (actual usage comes later; this import proves the file compiles):

```ts
import { useMonthStore } from './store/monthStore';
```

Temporarily log the month inside the existing `App` component to verify:

```ts
const month = useMonthStore((s) => s.currentDate);
console.log(month);
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 4: Remove temporary log**

Revert the `console.log` line so the store import is unused for now. Keep the import; it will be used by views.

- [ ] **Step 5: Commit**

```bash
git add src/store/monthStore.ts src/App.tsx
git commit -m "feat: add session month store"
```

---

### Task 2: Update theme tokens in CSS

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: Tailwind classes `bg-bg-primary`, `bg-bg-surface`, `bg-bg-elevated`, `border-border`, `text-text-primary`, `text-text-secondary`, `bg-accent`, `text-accent-inverse`.

- [ ] **Step 1: Replace `@theme` block and base layer**

Replace the contents of `src/index.css` with:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-bg-primary: #fafafa;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #f4f4f5;
  --color-border: #e4e4e7;
  --color-text-primary: #18181b;
  --color-text-secondary: #71717a;
  --color-accent: #18181b;
  --color-accent-inverse: #ffffff;

  --color-success: #10b981;
  --color-danger: #ef4444;
}

.dark {
  --color-bg-primary: #09090b;
  --color-bg-surface: #18181b;
  --color-bg-elevated: #27272a;
  --color-border: #27272a;
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-accent: #ffffff;
  --color-accent-inverse: #18181b;
}

@layer base {
  html, body {
    @apply h-full antialiased bg-bg-primary text-text-primary transition-colors duration-300;
  }

  #root {
    @apply h-full flex flex-col;
  }
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add monochrome theme tokens"
```

---

### Task 3: Update Layout

**Files:**
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: theme tokens from Task 2.

- [ ] **Step 1: Replace Layout classes**

Replace `src/components/Layout.tsx` with:

```tsx
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, CalendarDays, PieChart, Settings, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { path: '/charts', icon: PieChart, label: 'Gráficos' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function Layout() {
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-surface dark:bg-bg-primary shadow-2xl relative overflow-hidden sm:border-x sm:border-border">
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar relative">
        <Outlet />
      </main>

      <Link
        to="/add"
        className="absolute bottom-20 right-4 sm:right-6 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg text-accent-inverse hover:opacity-90 active:scale-95 transition-all z-50"
      >
        <Plus className="w-7 h-7" />
      </Link>

      <nav className="absolute bottom-0 w-full bg-bg-surface dark:bg-bg-primary/95 backdrop-blur-md border-t border-border pb-safe">
        <ul className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <li key={item.path} className="flex-1 h-full">
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center w-full h-full text-[10px] sm:text-xs font-medium gap-1 transition-all duration-200",
                  isActive
                    ? "text-accent scale-110"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <item.icon className={cn("w-5 h-5", "sm:w-6 sm:h-6")} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: apply monochrome tokens to layout"
```

---

### Task 4: Update Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `useMonthStore` from Task 1, theme tokens from Task 2.
- Produces: Dashboard reads/writes global month.

- [ ] **Step 1: Replace Dashboard code**

Replace `src/pages/Dashboard.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { DragHandle } from '../components/DragHandle';
import { useDndSortable, SortableItem } from '../lib/dndkit';
import { closestCenter } from '@dnd-kit/core';
import { useMonthStore } from '../store/monthStore';

export function Dashboard() {
  const navigate = useNavigate();
  const currentDate = useMonthStore((s) => s.currentDate);
  const setCurrentDate = useMonthStore((s) => s.setCurrentDate);
  const goToPreviousMonth = useMonthStore((s) => s.goToPreviousMonth);
  const goToNextMonth = useMonthStore((s) => s.goToNextMonth);

  const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const transactions = useLiveQuery(
    () => db.transactions
      .where('date')
      .between(start, end, true, true)
      .toArray(),
    [start, end]
  );

  const blocks = useLiveQuery(() => db.blocks.toArray());

  const [orderedBlocks, setOrderedBlocks] = useState(() => (blocks || []).slice().sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return a.id.localeCompare(b.id);
  }));

  useEffect(() => {
    if (blocks) {
      setOrderedBlocks(blocks.slice().sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        return a.id.localeCompare(b.id);
      }));
    }
  }, [blocks]);

  const {
    DndContext,
    SortableContext,
    verticalListSortingStrategy,
    sensors,
    handleDragEnd,
    handleDragStart,
  } = useDndSortable(orderedBlocks, async (newOrder) => {
    setOrderedBlocks(newOrder);
    await Promise.all(
      newOrder.map((b, i) => db.blocks.update(b.id, { order: i }))
    );
  });

  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const incomes = transactions?.filter(t => t.type === 'income') || [];
  const expenses = transactions?.filter(t => t.type === 'expense' && t.status === 'completed') || [];

  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const recentTransactions = transactions?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) || [];

  return (
    <div className="p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Visão Geral</h1>

        <div className="flex items-center justify-between bg-bg-elevated p-2 rounded-2xl border border-border">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-text-primary capitalize tracking-wide">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={goToNextMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-elevated p-5 rounded-3xl shadow-lg border border-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-accent"></div>
          <h2 className="text-sm font-medium text-text-secondary mb-1">Saldo Atual</h2>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-accent' : 'text-danger'}`}>
            R$ {balance.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:col-span-2 gap-4">
          <button
            className="bg-bg-elevated p-4 rounded-3xl shadow-lg border border-border text-left w-full"
            onClick={() => navigate(`/transactions?type=income&month=${format(currentDate, 'yyyy-MM')}`)}
          >
            <h2 className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Rendas</h2>
            <p className="text-xl font-semibold text-success">R$ {totalIncome.toFixed(2)}</p>
          </button>
          <button
            className="bg-bg-elevated p-4 rounded-3xl shadow-lg border border-border text-left w-full"
            onClick={() => navigate(`/transactions?type=expense&month=${format(currentDate, 'yyyy-MM')}`)}
          >
            <h2 className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Despesas</h2>
            <p className="text-xl font-semibold text-danger">R$ {totalExpense.toFixed(2)}</p>
          </button>
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Meus Blocos</h2>
        </div>

        {!blocks || blocks.length === 0 ? (
          <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
            <p className="text-text-secondary text-sm">Nenhum bloco configurado.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <SortableContext items={orderedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {orderedBlocks.map((block) => {
                  const blockExpenses = expenses.filter(e => e.blockId === block.id).reduce((acc, curr) => acc + curr.amount, 0);
                  const remaining = block.totalAmount - blockExpenses;
                  const percent = Math.min((blockExpenses / block.totalAmount) * 100, 100);
                  return (
                    <SortableItem key={block.id} id={block.id}>
                      <div
                        onClick={() => navigate(`/block/${block.id}?month=${format(currentDate, 'yyyy-MM')}`)}
                        className={cn(
                          "bg-bg-elevated p-5 rounded-3xl border border-border shadow-md transition-transform hover:scale-[1.02] cursor-pointer flex items-center group"
                        )}
                      >
                        <DragHandle className="opacity-70 group-hover:opacity-100" />
                        <div className="flex-1 ml-2">
                          <div className="flex justify-between items-end mb-3">
                            <div>
                              <h3 className="font-semibold text-text-primary text-lg">{block.name}</h3>
                              <p className="text-xs text-text-secondary mt-0.5">Orçamento: R$ {block.totalAmount.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                                R$ {remaining.toFixed(2)} restam
                              </p>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${percent > 90 ? 'bg-danger' : percent > 75 ? 'bg-yellow-500' : 'bg-accent'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="mt-2 text-right">
                            <span className="text-[10px] uppercase font-semibold text-text-secondary tracking-wider">Gasto: R$ {blockExpenses.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section className="mt-8 mb-4">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Transações Recentes</h2>
        {recentTransactions.length === 0 ? (
          <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
            <p className="text-text-secondary text-sm">Nenhuma transação recente.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recentTransactions.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              const color = cat?.color || (t.type === 'income' ? '#10b981' : '#ef4444');
              return (
                <li
                  key={t.id}
                  onClick={() => navigate(`/edit/${t.id}`)}
                  className="bg-bg-elevated p-4 rounded-3xl border border-border flex justify-between items-center shadow-md transition-transform hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div>
                      <p className="text-text-primary text-sm font-semibold flex items-center gap-2">
                        {t.description || cat?.name || 'Transação'}
                        {t.status === 'planned' && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
                            Planejado
                          </span>
                        )}
                      </p>
                      {t.description && cat?.name && <p className="text-xs text-text-secondary mt-0.5">{cat.name}</p>}
                    </div>
                  </div>
                  <p className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: apply tokens and global month to dashboard"
```

---

### Task 5: Update CalendarView

**Files:**
- Modify: `src/pages/CalendarView.tsx`

**Interfaces:**
- Consumes: `useMonthStore` from Task 1, theme tokens from Task 2.

- [ ] **Step 1: Replace CalendarView code**

Replace `src/pages/CalendarView.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { cn } from '../lib/utils';
import { useMonthStore } from '../store/monthStore';

export function CalendarView() {
  const navigate = useNavigate();
  const currentDate = useMonthStore((s) => s.currentDate);
  const setCurrentDate = useMonthStore((s) => s.setCurrentDate);
  const goToPreviousMonth = useMonthStore((s) => s.goToPreviousMonth);
  const goToNextMonth = useMonthStore((s) => s.goToNextMonth);

  const [selectedDate, setSelectedDate] = useState(currentDate);

  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const transactions = useLiveQuery(
    () => db.transactions
      .where('date')
      .between(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), true, true)
      .toArray(),
    [startDate.toISOString(), endDate.toISOString()]
  ) || [];

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTransactions = transactions.filter(t => t.date === selectedDateStr);
  const totalGastoDia = selectedTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <header className="p-4 sm:p-6 pb-2">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Calendário</h1>

        <div className="flex items-center justify-between mb-4 bg-bg-elevated p-2 rounded-2xl border border-border">
          <button onClick={goToPreviousMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-text-primary capitalize tracking-wide">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={goToNextMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-6 flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTrans = transactions.filter(t => t.date === dateStr);
            const hasIncome = dayTrans.some(t => t.type === 'income');
            const hasExpense = dayTrans.some(t => t.type === 'expense');
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);

            const handleDoubleClick = () => {
              navigate(`/add?date=${dateStr}`);
            };

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={handleDoubleClick}
                className={cn(
                  "aspect-square flex flex-col items-center justify-start p-1.5 sm:p-2 rounded-2xl border transition-all duration-200",
                  !isCurrentMonth ? "text-text-secondary border-transparent bg-transparent" : "bg-bg-elevated border-border text-text-primary hover:bg-bg-surface",
                  isSelected && "border-4 border-accent bg-accent text-accent-inverse font-bold",
                  isSameDay(day, new Date()) && !isSelected && "border-border font-bold text-text-primary"
                )}
              >
                <span className="text-xs sm:text-sm">{format(day, 'd')}</span>
                <div className="flex gap-1 mt-1.5">
                  {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                  {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-danger" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pb-24">
          <h3 className="text-sm font-semibold text-text-primary mb-4 capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">Total gasto no dia:</span>
            <span className="text-sm font-semibold text-danger">R$ {totalGastoDia.toFixed(2)}</span>
          </div>
          {selectedTransactions.length === 0 ? (
            <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
              <p className="text-text-secondary text-sm">Nenhuma transação neste dia.</p>
            </div>
          ) : (
            <div className="pb-4">
              <ul className="space-y-3">
                {selectedTransactions.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const color = cat?.color || (t.type === 'income' ? '#10b981' : '#ef4444');
                  return (
                    <li
                      key={t.id}
                      onClick={() => navigate(`/edit/${t.id}`)}
                      className="bg-bg-elevated p-4 rounded-3xl border border-border flex justify-between items-center shadow-md transition-transform hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <p className="text-text-primary text-sm font-semibold flex items-center gap-2">
                            {t.description || cat?.name || 'Transação'}
                            {t.status === 'planned' && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
                                Planejado
                              </span>
                            )}
                          </p>
                          {t.description && cat?.name && <p className="text-xs text-text-secondary mt-0.5">{cat.name}</p>}
                        </div>
                      </div>
                      <p className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CalendarView.tsx
git commit -m "feat: apply tokens and global month to calendar"
```

---

### Task 6: Update BlockDetails

**Files:**
- Modify: `src/pages/BlockDetails.tsx`

**Interfaces:**
- Consumes: `useMonthStore` from Task 1, theme tokens from Task 2.

- [ ] **Step 1: Replace BlockDetails code**

Replace `src/pages/BlockDetails.tsx` with:

```tsx
import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMonthStore } from '../store/monthStore';

export function BlockDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const monthParam = params.get('month');

  const storeDate = useMonthStore((s) => s.currentDate);
  const setStoreDate = useMonthStore((s) => s.setCurrentDate);

  useEffect(() => {
    if (monthParam) {
      setStoreDate(parseISO(`${monthParam}-01`));
    }
  }, [monthParam, setStoreDate]);

  const targetDate = monthParam ? parseISO(`${monthParam}-01`) : storeDate;
  const start = format(startOfMonth(targetDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(targetDate), 'yyyy-MM-dd');

  const block = useLiveQuery(() => id ? db.blocks.get(id) : undefined, [id]);
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const transactions = useLiveQuery(
    async () => {
      if (!id) return [];
      return await db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter(t => t.blockId === id)
        .toArray();
    },
    [id, start, end]
  ) || [];

  if (!block) return <div className="p-6 text-text-secondary flex items-center justify-center h-full">Carregando bloco...</div>;

  const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'completed');
  const spent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = block.totalAmount - spent;
  const percent = Math.min((spent / block.totalAmount) * 100, 100);

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center gap-4 bg-bg-primary sticky top-0 z-10 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{block.name}</h1>
          <p className="text-xs text-text-secondary capitalize">
            {format(targetDate, 'MMMM yyyy', { locale: ptBR })} • Orçamento {block.period === 'monthly' ? 'Mensal' : 'Semanal'}
          </p>
        </div>
      </header>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto pb-24 space-y-6">
        <section className="bg-bg-elevated p-6 rounded-3xl shadow-lg border border-border">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">Gasto</p>
              <p className="text-2xl font-bold text-text-primary">R$ {spent.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">Restante</p>
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                R$ {remaining.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="h-3 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${percent > 90 ? 'bg-danger' : percent > 75 ? 'bg-yellow-500' : 'bg-accent'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-center text-xs text-text-secondary mt-3 font-medium">Orçamento Total: R$ {block.totalAmount.toFixed(2)}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Transações do Bloco</h2>
          {transactions.length === 0 ? (
            <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
              <p className="text-text-secondary text-sm">Nenhuma transação registrada neste bloco.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const color = cat?.color || (t.type === 'income' ? '#10b981' : '#ef4444');
                return (
                  <li
                    key={t.id}
                    onClick={() => navigate(`/edit/${t.id}`)}
                    className="bg-bg-elevated p-4 rounded-3xl border border-border flex justify-between items-center shadow-md transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div>
                        <p className="text-text-primary text-sm font-semibold flex items-center gap-2">
                          {t.description || cat?.name || 'Transação'}
                          {t.status === 'planned' && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
                              Planejado
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">{cat?.name} • {format(new Date(t.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <p className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/BlockDetails.tsx
git commit -m "feat: apply tokens and month store fallback to block details"
```

---

### Task 7: Update AddTransaction

**Files:**
- Modify: `src/pages/AddTransaction.tsx`

**Interfaces:**
- Consumes: theme tokens from Task 2.

- [ ] **Step 1: Replace AddTransaction code**

Replace `src/pages/AddTransaction.tsx` with:

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AddTransaction.tsx
git commit -m "feat: apply monochrome tokens to transaction form"
```

---

### Task 8: Update TransactionListView

**Files:**
- Modify: `src/pages/TransactionListView.tsx`

**Interfaces:**
- Consumes: theme tokens from Task 2.

- [ ] **Step 1: Replace TransactionListView code**

Replace `src/pages/TransactionListView.tsx` with:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../db';
import { format, parseISO, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

export function TransactionListView() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const type = params.get('type') === 'income' ? 'income' : 'expense';
  const monthParam = params.get('month');

  const transactions = useLiveQuery(async () => {
    if (monthParam) {
      const start = `${monthParam}-01`;
      const dateObj = parseISO(start);
      const end = format(endOfMonth(dateObj), 'yyyy-MM-dd');
      return await db.transactions
        .where('date')
        .between(start, end, true, true)
        .filter(t => t.type === type)
        .toArray();
    }
    return await db.transactions.where('type').equals(type).toArray();
  }, [type, monthParam]) || [];

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];

  const grouped = transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((acc, t) => {
      (acc[t.date] = acc[t.date] || []).push(t);
      return acc;
    }, {} as Record<string, typeof transactions>);

  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-bg-primary shadow-2xl sm:border-x sm:border-border">
      <header className="p-4 flex items-center gap-4 bg-bg-primary sticky top-0 z-10 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-bg-elevated text-text-secondary transition-colors">
          Voltar
        </button>
        <h1 className="text-lg font-semibold text-text-primary flex flex-col">
          <span>{type === 'income' ? 'Rendas' : 'Despesas'}</span>
          {monthParam && (
            <span className="text-xs text-text-secondary font-normal capitalize">
              {format(parseISO(`${monthParam}-01`), 'MMMM yyyy', { locale: ptBR })}
            </span>
          )}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {dates.length === 0 && (
          <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed mt-8">
            <p className="text-text-secondary text-sm">Nenhuma transação encontrada.</p>
          </div>
        )}
        {dates.map(date => (
          <div key={date}>
            <div className="mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
              {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
            <ul className="space-y-3">
              {grouped[date].map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const block = t.blockId ? blocks.find(b => b.id === t.blockId) : null;
                return (
                  <li key={t.id} className="bg-bg-elevated p-4 rounded-3xl border border-border flex justify-between items-center shadow-md transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => navigate(`/edit/${t.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{t.description || cat?.name || 'Transação'}</span>
                        {block && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border">{block.name}</span>}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {cat?.name}
                      </div>
                    </div>
                    <span className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TransactionListView.tsx
git commit -m "feat: apply monochrome tokens to transaction list"
```

---

### Task 9: Implement inline block editing

**Files:**
- Modify: `src/pages/SettingsView.tsx`

**Interfaces:**
- Consumes: theme tokens from Task 2.
- Produces: Inline editing UI for blocks; calls `db.blocks.update`.

- [ ] **Step 1: Add imports and editing state**

Change the `lucide-react` import in `src/pages/SettingsView.tsx` from:

```ts
import { Plus, Trash2, Sun, Moon } from 'lucide-react';
```

to:

```ts
import { Plus, Trash2, Sun, Moon, Pencil, Check, X } from 'lucide-react';
```

Add editing state after the existing `newBlockPeriod` state:

```ts
const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
const [editName, setEditName] = useState('');
const [editAmount, setEditAmount] = useState('');
const [editPeriod, setEditPeriod] = useState<PeriodType>('monthly');
```

- [ ] **Step 2: Add edit helpers**

Add these helper functions inside `SettingsView` after `handleDeleteBlock`:

```ts
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
```

Also import `Block` from `../db` if not already imported:

```ts
import { db, type PeriodType, type TransactionType, type Block } from '../db';
```

- [ ] **Step 3: Replace the block list rendering**

Find the block list `<ul className="space-y-3">` and replace its inner `blocks.map(...)` with:

```tsx
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
          <p className="text-accent font-medium text-sm mt-0.5">R$ {b.totalAmount.toFixed(2)}</p>
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
```

- [ ] **Step 4: Apply theme tokens to the rest of SettingsView**

Replace remaining slate/blue references in `SettingsView.tsx`:

- Page wrapper: `p-4 sm:p-6 pb-24 bg-bg-primary` (add `bg-bg-primary` to outer div).
- Header title: `text-text-primary`.
- Section titles: `text-text-primary`.
- Add-block form: `bg-bg-elevated border-border`.
- Labels: `text-text-secondary`.
- Inputs/selects: `bg-bg-surface border-border text-text-primary focus:border-accent focus:ring-accent`.
- Add buttons: `bg-accent text-accent-inverse hover:opacity-90`.
- Category list items: `bg-bg-elevated border-border`.
- Toggle theme button: `bg-bg-elevated text-text-secondary hover:bg-bg-surface`.

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SettingsView.tsx
git commit -m "feat: inline block editing and theme tokens in settings"
```

---

### Task 10: Final verification

**Files:**
- All modified files.

- [ ] **Step 1: Run linter**

Run: `npm run lint`
Expected: no errors (or only pre-existing warnings).

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Start dev server and visually verify**

Run: `npm run dev`

Manual checks:
1. Modo escuro: fundo quase preto, cards cinza escuro, texto branco, FAB branco.
2. Modo claro: fundo cinza claro, cards brancos, texto preto, FAB preto.
3. Nenhum glow azul visível.
4. Dashboard: mudar mês, trocar para Calendário, voltar para Início — mês permanece.
5. CalendarView: mudar mês, ir para Gráficos, voltar — mês permanece.
6. Fechar a aba e reabrir: mês volta para o atual.
7. Ajustes: criar bloco, depois clicar no lápis, alterar nome/valor/período, salvar.
8. Bloco atualizado reflete no Dashboard e BlockDetails.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: final theme and interaction polish"
```

---

## Self-Review

**Spec coverage:**
- Monochrome tokens: Task 2.
- Layout theming: Task 3.
- Dashboard theming + month store: Task 4.
- Calendar theming + month store: Task 5.
- BlockDetails theming + month fallback: Task 6.
- AddTransaction theming: Task 7.
- TransactionListView theming: Task 8.
- Inline block editing: Task 9.
- Verification: Task 10.

**Placeholder scan:** No TBD/TODO/vague steps.

**Type consistency:** `useMonthStore` shape matches across consumers. `Block` type used in `startEdit`. Currency helpers reused consistently.
