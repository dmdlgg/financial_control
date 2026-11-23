import {
  db,
  type Category,
  type Block,
  type RecurringTransaction,
  type Transaction,
  type ReceivableCategory,
  type ReceivableDebtor,
  type ReceivableDebt,
  type ReceivableInstallment,
  type ReceivableSettledDebt,
} from './index';
import { processRecurringTransactions } from '../lib/recurrence';
import { differenceInCalendarMonths, parseISO } from 'date-fns';
import backupData from '../data/initialBackup.json';

export async function seedInitialData(force = false): Promise<boolean> {
  const categoriesCount = await db.categories.count();
  const hasMockData = await db.categories.get('cat-moradia');
  const hasCleanMpRule = await db.recurringTransactions.get('1faa460a-ae8e-4af4-8ce8-6b7e0821c9bf');

  // Substitui se forçado, se o banco estiver vazio, se ainda tiver mock data ou se ainda não tiver a base corrigida
  if (!force && categoriesCount > 0 && !hasMockData && hasCleanMpRule) {
    // Mesmo sem fazer seed completo, garante que as categorias do backup tenham cores
    const backupCategories = backupData.categories as Category[];
    for (const bc of backupCategories) {
      if (bc.color) {
        const existing = await db.categories.get(bc.id);
        if (existing && !existing.color) {
          await db.categories.update(bc.id, { color: bc.color });
        }
      }
    }
    return false;
  }

  // Limpa todas as tabelas para garantir dados puros do backup
  await Promise.all([
    db.transactions.clear(),
    db.blocks.clear(),
    db.categories.clear(),
    db.recurringTransactions.clear(),
    db.receivableCategories.clear(),
    db.receivableDebtors.clear(),
    db.receivableDebts.clear(),
    db.receivableInstallments.clear(),
    db.receivableSettledDebts.clear(),
  ]);

  // 1. Categorias
  const categories = backupData.categories as Category[];
  if (categories?.length) {
    await db.categories.bulkPut(categories);
  }

  // 2. Blocos
  const blocks = (backupData.blocks || []) as Block[];
  const blockIds = new Set(blocks.map(b => b.id));
  if (blocks.length) {
    await db.blocks.bulkPut(blocks);
  }

  // 3. Transações Recorrentes
  const recurring = (backupData.recurringTransactions || []) as RecurringTransaction[];
  const cleanedRecurring: RecurringTransaction[] = [];
  const recMap = new Map<string, RecurringTransaction>();

  for (const r of recurring) {
    const clean: RecurringTransaction = {
      ...r,
      blockId: r.blockId && blockIds.has(r.blockId) ? r.blockId : undefined,
      description: r.description?.trim() ? r.description.trim() : (r.type === 'income' ? 'Salário' : 'Despesa Recorrente'),
    };
    cleanedRecurring.push(clean);
    recMap.set(clean.id, clean);
  }

  if (cleanedRecurring.length) {
    await db.recurringTransactions.bulkPut(cleanedRecurring);
  }

  // 4. Transações (Higienização e Deduplicação)
  const rawTransactions = (backupData.transactions || []) as Transaction[];
  const cleanedTransactions: Transaction[] = [];
  const seenKeys = new Set<string>();

  for (const t of rawTransactions) {
    // Chave para identificar duplicidades exatas geradas por regras órfãs
    const dupKey = `${t.date}|${t.amount}|${t.description || ''}|${t.type}`;
    if (seenKeys.has(dupKey)) {
      continue; // Remove a transação duplicada
    }
    seenKeys.add(dupKey);

    const clean: Transaction = {
      ...t,
      blockId: t.blockId && blockIds.has(t.blockId) ? t.blockId : undefined,
      recurrenceId: t.recurrenceId && recMap.has(t.recurrenceId) ? t.recurrenceId : undefined,
    };

    // Atribui número de parcela e total se fizer parte de uma recorrência limitada
    if (clean.recurrenceId) {
      const rule = recMap.get(clean.recurrenceId);
      if (rule && rule.recurrenceType === 'limited' && rule.recurrenceEndDate) {
        const start = parseISO(rule.startDate);
        const end = parseISO(rule.recurrenceEndDate);
        const total = rule.installmentsCount || (differenceInCalendarMonths(end, start) + 1);
        const num = differenceInCalendarMonths(parseISO(clean.date), start) + 1;
        if (num >= 1 && num <= total) {
          clean.installmentNumber = num;
          clean.installmentTotal = total;
        }
      }
    }

    cleanedTransactions.push(clean);
  }

  if (cleanedTransactions.length) {
    await db.transactions.bulkPut(cleanedTransactions);
  }

  // 5. Receivables (A Receber)
  const rCategories = (backupData.receivableCategories || []) as ReceivableCategory[];
  if (rCategories.length) await db.receivableCategories.bulkPut(rCategories);

  const rDebtors = (backupData.receivableDebtors || []) as ReceivableDebtor[];
  if (rDebtors.length) await db.receivableDebtors.bulkPut(rDebtors);

  const rDebts = (backupData.receivableDebts || []) as ReceivableDebt[];
  if (rDebts.length) await db.receivableDebts.bulkPut(rDebts);

  const rInstallments = (backupData.receivableInstallments || []) as ReceivableInstallment[];
  if (rInstallments.length) await db.receivableInstallments.bulkPut(rInstallments);

  const rSettled = (backupData.receivableSettledDebts || []) as ReceivableSettledDebt[];
  if (rSettled.length) await db.receivableSettledDebts.bulkPut(rSettled);

  // Executa processamento de recorrências para garantir sincronia
  await processRecurringTransactions();

  return true;
}
