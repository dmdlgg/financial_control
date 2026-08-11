# Especificação: Controle de Pagamentos a Receber

## Status

Aprovado em 2026-08-11.

## Objetivo

Adicionar ao Controle Financeiro uma funcionalidade separada para controlar dinheiro que o usuário tem a receber fora do salário (empréstimos, parcelas de cartão, etc). A feature deve ser logicamente isolada das finanças principais — não integra saldo, rendas ou despesas do app — mas possui resumos próprios.

## Requisitos principais

- Separação por categorias criadas pelo usuário (ex: "Cartão Nubank").
- Subcategorias por devedor dentro de cada categoria (ex: "Fulano X", "Fulano Y").
- Cada devedor pode ter uma ou mais dívidas.
- Cada dívida pode ser parcelada. Parcelas são geradas automaticamente por mês.
- Parcelas iguais por padrão, mas o usuário pode receber um valor diferente; o sistema recalcula o restante automaticamente.
- Botão de check em cada parcela para marcar como paga. Parcela paga fica riscada no mês em que foi quitada.
- Parcelas pagas somem ao trocar de mês e vão para histórico.
- Dívidas totalmente quitadas saem da lista ativa e vão para histórico de dívidas quitadas.
- Badge na aba inferior e banner na tela "A Receber" no fim do mês, lembrando de confirmar parcelas pendentes.
- Resumos de total a receber: geral, por categoria, por devedor e por dívida.

## Navegação

Nova aba inferior "A Receber" (ícone `Wallet` ou `HandCoins` do Lucide), posicionada entre "Gráficos" e "Ajustes".

Rotas:

| Rota | Descrição |
|------|-----------|
| `/receivables` | Lista de categorias com total a receber |
| `/receivables/category/:id` | Devedores da categoria |
| `/receivables/debtor/:id` | Dívidas do devedor |
| `/receivables/debt/:id` | Parcelas da dívida, com seletor de mês |
| `/receivables/history` | Dívidas quitadas |
| `/receivables/new-category` | Criar/editar categoria |
| `/receivables/new-debtor` | Criar/editar devedor |
| `/receivables/new-debt` | Criar/editar dívida |

Fluxo: Categorias → Devedores → Dívidas → Parcelas.

FAB azul em cada tela adiciona o item do nível atual.

## Modelo de dados

Novas tabelas no Dexie/IndexedDB:

```ts
interface ReceivableCategory {
  id: string;
  name: string;
  color?: string;
  createdAt: string; // ISO date
}

interface ReceivableDebtor {
  id: string;
  categoryId: string;
  name: string;
}

interface ReceivableDebt {
  id: string;
  debtorId: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  installmentsCount: number;
  startMonth: string; // YYYY-MM
  createdAt: string;
  settledAt?: string;
}

interface ReceivableInstallment {
  id: string;
  debtId: string;
  month: string; // YYYY-MM
  number: number; // 1, 2, 3...
  expectedAmount: number;
  paidAmount?: number;
  paidAt?: string; // ISO date
  status: 'pending' | 'paid' | 'partial';
}

interface ReceivableSettledDebt {
  id: string;
  categoryId: string;
  debtorId: string;
  description: string;
  totalAmount: number;
  settledAt: string;
  installmentsCount: number;
}
```

Índices sugeridos:

```ts
receivableCategories: 'id, name',
receivableDebtors: 'id, categoryId, name',
receivableDebts: 'id, debtorId, settledAt',
receivableInstallments: 'id, debtId, month, status',
receivableSettledDebts: 'id, categoryId, debtorId, settledAt'
```

## Geração de parcelas

Ao criar uma dívida:

1. Salva `ReceivableDebt` com `remainingAmount = totalAmount`.
2. Gera N registros `ReceivableInstallment`, um para cada mês a partir de `startMonth`.
3. `expectedAmount` é calculado como `totalAmount / installmentsCount`, arredondado para 2 casas decimais. A última parcela absorve os centavos restantes para garantir que a soma bata exatamente com `totalAmount`.

Exemplo: R$ 1.000,00 em 10x → 9 parcelas de R$ 100,00 e a 10ª de R$ 100,00. Se houver centavos, ajusta na última.

## Exibição de parcelas

Tela `/receivables/debt/:id` mostra as parcelas do mês selecionado.

- Mês selecionado: mostra parcela daquele mês.
  - Pendente: valor + botão de check.
  - Paga: riscada + valor pago.
  - Parcial: valor pago + restante + check para completar.
- Meses anteriores com parcela não paga: aparecem destacadas (vermelho/laranja) até serem quitadas.
- Meses futuros: parcelas aparecem só para visualização, check desabilitado.

Seletor de mês igual ao Dashboard (anterior / próximo / mês-ano centralizado).

## Pagamento e reajuste

Ao tocar no check de uma parcela:

1. Abre modal perguntando o valor recebido **neste pagamento** (default: valor restante da parcela = `expectedAmount - (paidAmount || 0)`).
2. Soma o valor informado ao `paidAmount` acumulado da parcela.
3. Compara `paidAmount` acumulado com `expectedAmount`:
   - Menor: `status = 'partial'`, parcela continua pendente pelo restante.
   - Igual ou maior: `status = 'paid'`, `paidAt = hoje`.
4. Se o total pago na parcela ultrapassar `expectedAmount`, o excesso reduz `ReceivableDebt.remainingAmount` (além do `expectedAmount` normal).
5. Atualiza `ReceivableDebt.remainingAmount` subtraindo o valor efetivamente aplicado à dívida (sempre `expectedAmount` quando parcela é paga em dia; se pagou menos, subtrai o valor menor; se pagou mais, o excesso já foi contabilizado no passo 4).
6. Recalcula `expectedAmount` das parcelas futuras ainda pendentes:
   - `pendingFutureCount` = parcelas com status `pending` dos meses seguintes ao atual.
   - `newExpected = remainingAmount / pendingFutureCount`, arredondado para 2 casas decimais com `Math.round(x * 100) / 100`.
   - A última parcela pendente futura recebe o valor restante necessário para que a soma das parcelas futuras bata exatamente com `remainingAmount`.
7. Se `remainingAmount <= 0`, marca dívida como quitada.

**Pagamentos parciais múltiplos:** uma parcela pode receber vários pagamentos parciais até atingir ou ultrapassar o `expectedAmount`. Cada pagamento atualiza `paidAmount` e dispara o recálculo das parcelas futuras.

## Quitação e histórico

Quando `remainingAmount <= 0`:

1. Preenche `ReceivableDebt.settledAt` com a data atual.
2. Copia dados resumidos para `ReceivableSettledDebt`.
3. Dívida some das listas ativas.
4. Tela `/receivables/history` lista dívidas quitadas, agrupadas por categoria e devedor.

Parcelas pagas aparecem riscadas no mês em que foram quitadas. Ao mudar para outro mês, somem da visualização mensal (permanecem no banco e podem ser vistas no histórico da dívida).

## Badge e banner de fim de mês

Lógica de gatilho: faltam 5 dias ou menos para o fim do mês atual e existem parcelas do mês atual com status `pending`.

- **Badge:** ponto vermelho no ícone da aba "A Receber".
- **Banner:** ao abrir `/receivables`, exibe faixa amarela/laranja com:
  - Texto: "Há parcelas de [mês atual] ainda não confirmadas. Já recebeu?"
  - Ações: "Ver parcelas" / "Depois".

Se não houver parcelas pendentes do mês atual, nem badge nem banner aparecem.

## Resumos

- Tela `/receivables`: total a receber = soma de `remainingAmount` de todas as dívidas não quitadas.
- Tela `/receivables/category/:id`: soma de `remainingAmount` das dívidas dos devedores da categoria.
- Tela `/receivables/debtor/:id`: soma de `remainingAmount` das dívidas do devedor.
- Tela `/receivables/debt/:id`: valor original, total recebido (`totalAmount - remainingAmount`) e restante.

## Estilo visual

- Manter padrão existente: cards arredondados (`rounded-3xl`), fundo `slate-100` no light / `slate-800/60` no dark, bordas sutis.
- Cor temática para "a receber": azul/índigo (`blue-500`/`indigo-500`), diferenciando de verde (renda) e vermelho (despesa).
- FAB azul para adicionar em todas as telas da feature.
- Ícones Lucide.

## Escopo fora desta entrega

- Notificações push nativas (requer backend/serviço push para PWA).
- Testes automatizados unitários (projeto não possui jest/vitest configurado).
- Integração com saldo/rendas do app principal.

## Verificação de entrega

Antes de finalizar, verificar:

- Rotas carregam sem erro.
- CRUD de categoria, devedor e dívida funciona.
- Parcelas são geradas corretamente.
- Pagamento atualiza `remainingAmount`.
- Pagamento parcial e pagamento a mais recalculam parcelas futuras.
- Quitação move dívida para histórico.
- Badge e banner aparecem no fim do mês quando há parcelas pendentes.
- Build (`npm run build`) passa sem erros TypeScript.
