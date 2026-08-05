# Especificação: Identidade Visual, Edição de Blocos e Persistência de Mês

## Contexto

Aplicativo React + Vite + Tailwind CSS v4 + TypeScript + Dexie (IndexedDB) + Zustand.
Tema atual usa `slate-900` no modo escuro e azul saturado como cor primária, gerando visual genérico de template de IA.

## Objetivos

1. Trocar identidade visual para paleta monocromática elegante, menos genérica.
2. Permitir edição inline do nome, valor e período dos blocos de orçamento em Ajustes.
3. Fazer o mês selecionado persistir durante a sessão ao navegar entre telas.

## 1. Paleta e Tokens

### Decisões

- UI monocromática. Cores funcionais de transação/categoria mantidas.
- Fundo escuro mais profundo e bonito que `slate-900`.
- Superfícies e bordas sólidas, sem opacidade e sem glows azuis.
- Cor primária inverte entre modos: preto no claro, branco no escuro.

### Tokens CSS (`src/index.css`)

```css
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
```

Base layer:

```css
@layer base {
  html, body {
    @apply h-full antialiased bg-bg-primary text-text-primary transition-colors duration-300;
  }
}
```

## 2. Componentes e Páginas Afetadas

Trocar manualmente todas as referências de `bg-slate-*`, `text-slate-*`, `border-slate-*`, `bg-blue-*`, `hover:bg-blue-*`, `shadow-blue-*` para os tokens acima.

### `src/components/Layout.tsx`

- Container: `bg-bg-surface` no claro, `bg-bg-primary` no escuro.
- Bordas: `border-border`.
- FAB: `bg-accent text-accent-inverse hover:opacity-90`, sem shadow colorido.
- Nav ativo: `text-accent scale-110`.
- Nav inativo: `text-text-secondary hover:text-text-primary`.

### `src/pages/Dashboard.tsx`

- Fundo geral: `bg-bg-primary`.
- Cards/blocos: `bg-bg-elevated border-border`.
- Títulos: `text-text-primary`.
- Subtítulos: `text-text-secondary`.
- Barra de progresso do bloco:
  - `<= 75%`: `bg-accent`
  - `> 75%`: `bg-yellow-500`
  - `> 90%`: `bg-red-500`
- Saldo positivo: `text-accent`.
- Saldo negativo: `text-danger`.

### `src/pages/CalendarView.tsx`

- Fundo: `bg-bg-primary`.
- Dias do mês atual: `bg-bg-elevated border-border text-text-primary hover:bg-bg-surface`.
- Dia selecionado: `bg-accent text-accent-inverse border-accent`.
- Dia hoje (não selecionado): `border-border font-bold text-text-primary`.
- Dias fora do mês: `text-text-secondary`.
- Remove glow azul da seleção.

### `src/pages/BlockDetails.tsx`

- Fundo: `bg-bg-primary`.
- Cards: `bg-bg-elevated border-border`.
- Barra de progresso mesma regra do Dashboard.

### `src/pages/AddTransaction.tsx`

- Fundo: `bg-bg-primary`.
- Inputs: `bg-bg-elevated border-border text-text-primary focus:border-accent focus:ring-accent`.
- Botão submit: `bg-accent text-accent-inverse hover:opacity-90`.
- Toggle despesa/renda: ativo mantém `bg-red-500`/`bg-emerald-500`; inativo usa `bg-bg-elevated text-text-secondary`.
- Status realizado/planejado: ativo mantém `bg-accent`/`bg-purple-500`; inativo `bg-bg-elevated text-text-secondary`.

### `src/pages/TransactionListView.tsx`

- Fundo: `bg-bg-primary`.
- Cards: `bg-bg-elevated border-border`.
- Tag de bloco: `bg-bg-elevated text-text-secondary border-border`.

### `src/pages/SettingsView.tsx`

- Fundo: `bg-bg-primary`.
- Cards/formulários/listas: `bg-bg-elevated border-border`.
- Inputs/selects: `bg-bg-surface border-border focus:border-accent`.
- Botão adicionar bloco/categoria: `bg-accent text-accent-inverse`.
- Botão deletar: mantém vermelho funcional.

### `src/lib/constants.ts`

Mantém `CATEGORY_COLORS` inalterado.

## 3. Edição Inline de Blocos

### Comportamento

- Cada item da lista de blocos em `SettingsView` pode entrar em modo de edição.
- Ícone de lápis ao lado do ícone de lixeira.
- Ao clicar no lápis:
  - Linha vira inputs inline para nome, valor (com máscara de moeda) e período (select).
  - Botões de confirmar (check) e cancelar (X) substituem o lápis/lixeira.
- Ao confirmar: `db.blocks.update(id, { name, totalAmount, period })`.
- Ao cancelar: volta ao valor original.
- Não permite editar mais de um bloco ao mesmo tempo (estado `editingBlockId`).

### Estado

```ts
const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
const [editName, setEditName] = useState('');
const [editAmount, setEditAmount] = useState('');
const [editPeriod, setEditPeriod] = useState<PeriodType>('monthly');
```

### Ações

```ts
const startEdit = (block: Block) => {
  setEditingBlockId(block.id);
  setEditName(block.name);
  setEditAmount(formatCurrencyInput(block.totalAmount.toFixed(2).replace(/\D/g, '')));
  setEditPeriod(block.period);
};

const cancelEdit = () => setEditingBlockId(null);

const saveEdit = async (id: string) => {
  await db.blocks.update(id, {
    name: editName,
    totalAmount: parseCurrencyInput(editAmount),
    period: editPeriod
  });
  setEditingBlockId(null);
};
```

## 4. Persistência de Mês na Sessão

### Decisão

- Usar Zustand store em memória (sem persist middleware), então o mês selecionado dura até fechar o app.
- Store único `useMonthStore`.
- Todas as telas com navegação de mês consomem e atualizam esse store.
- Ainda permite URLs com `?month=YYYY-MM` para links diretos.

### Store

```ts
// src/store/monthStore.ts
import { create } from 'zustand';

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
    currentDate: subMonths(state.currentDate, 1)
  })),
  goToNextMonth: () => set((state) => ({
    currentDate: addMonths(state.currentDate, 1)
  })),
}));
```

### Telas afetadas

- `Dashboard`: substituir `useState(new Date())` por `useMonthStore`.
- `CalendarView`: substituir `useState(new Date())` por `useMonthStore`.
- `BlockDetails`: continua lendo `month` da URL quando presente; quando ausente, usa o store.
- `TransactionListView`: continua lendo `month` da URL (links do Dashboard já incluem `?month=`).

### Inicialização por URL

Quando uma tela monta e há `month` na URL, sincroniza o store:

```ts
const monthParam = params.get('month');
const { currentDate, setCurrentDate } = useMonthStore();

useEffect(() => {
  if (monthParam) {
    setCurrentDate(parseISO(`${monthParam}-01`));
  }
}, [monthParam]);
```

Isso garante que links diretos funcionem e o mês compartilhado continue sincronizado.

## 5. Data Flow e Estados

```
useMonthStore (memória)
  ├── Dashboard lê/escreve
  ├── CalendarView lê/escreve
  └── BlockDetails lê como fallback

db.blocks (IndexedDB)
  ├── SettingsView: create, update (edição inline), delete
  ├── Dashboard: read + ordenação
  └── BlockDetails: read
```

## 6. Testes de Verificação

1. Modo escuro: fundo quase preto, cards cinza escuro, texto branco, botões primários brancos com texto escuro.
2. Modo claro: fundo cinza claro, cards brancos, texto preto, botões primários pretos com texto branco.
3. Nenhum glow azul restante no app.
4. Em Ajustes, editar nome, valor e período de um bloco inline funciona.
5. Navegar de Dashboard para outra aba e voltar mantém o mês selecionado.
6. Fechar e reabrir o app reseta para o mês atual (comportamento desejado).
7. Links com `?month=YYYY-MM` ainda funcionam.

## 7. Arquivos a Modificar

- `src/index.css`
- `src/components/Layout.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/CalendarView.tsx`
- `src/pages/BlockDetails.tsx`
- `src/pages/AddTransaction.tsx`
- `src/pages/TransactionListView.tsx`
- `src/pages/SettingsView.tsx`
- `src/store/monthStore.ts` (novo)
