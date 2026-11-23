import { db } from '../db';
import { addMonths, format, parseISO, isBefore, isSameDay, differenceInCalendarMonths } from 'date-fns';

export async function processRecurringTransactions() {
  const recurring = await db.recurringTransactions.toArray();
  const now = new Date();
  // Generate up to 12 months in the future from now
  const generateUntil = addMonths(now, 12);

  for (const rt of recurring) {
    let lastGenerated = rt.lastGeneratedDate ? parseISO(rt.lastGeneratedDate) : parseISO(rt.startDate);
    const end = rt.recurrenceType === 'limited' && rt.recurrenceEndDate 
      ? parseISO(rt.recurrenceEndDate) 
      : generateUntil;
    
    // Determine the generation limit for this iteration
    const limitDate = isBefore(end, generateUntil) ? end : generateUntil;

    // Calculate total installments if limited
    let totalInstallments: number | undefined = undefined;
    if (rt.recurrenceType === 'limited' && rt.recurrenceEndDate) {
      const start = parseISO(rt.startDate);
      const endDate = parseISO(rt.recurrenceEndDate);
      totalInstallments = rt.installmentsCount || (differenceInCalendarMonths(endDate, start) + 1);
    }

    let nextDate = rt.lastGeneratedDate ? addMonths(lastGenerated, 1) : lastGenerated;
    let newGeneratedDate = rt.lastGeneratedDate;
    let transactionsToAdd = [];

    while (isBefore(nextDate, limitDate) || isSameDay(nextDate, limitDate)) {
      const dateStr = format(nextDate, 'yyyy-MM-dd');
      
      let installmentNumber: number | undefined = undefined;
      if (rt.recurrenceType === 'limited' && totalInstallments) {
        const start = parseISO(rt.startDate);
        installmentNumber = differenceInCalendarMonths(nextDate, start) + 1;
      }

      transactionsToAdd.push({
        id: crypto.randomUUID(),
        type: rt.type,
        amount: rt.amount,
        categoryId: rt.categoryId,
        date: dateStr,
        blockId: rt.blockId,
        description: rt.description,
        status: rt.status,
        recurrenceId: rt.id,
        installmentNumber,
        installmentTotal: totalInstallments
      });

      newGeneratedDate = dateStr;
      nextDate = addMonths(nextDate, 1);
    }

    if (transactionsToAdd.length > 0) {
      await db.transactions.bulkAdd(transactionsToAdd);
      await db.recurringTransactions.update(rt.id, { lastGeneratedDate: newGeneratedDate });
    }
  }

  // Cleanup potential duplicates
  const allTransactions = await db.transactions.toArray();
  const seen = new Set<string>();
  const duplicatesToDelete: string[] = [];
  
  for (const t of allTransactions) {
    if (t.recurrenceId) {
      const key = `${t.recurrenceId}-${t.date}`;
      if (seen.has(key)) {
        duplicatesToDelete.push(t.id);
      } else {
        seen.add(key);
      }
    }
  }
  
  if (duplicatesToDelete.length > 0) {
    await db.transactions.bulkDelete(duplicatesToDelete);
  }

  // Backfill installmentNumber/total for any existing transactions from limited recurrences
  const recurringMap = new Map(recurring.map(r => [r.id, r]));
  for (const t of allTransactions) {
    if (t.recurrenceId && (!t.installmentNumber || !t.installmentTotal)) {
      const rule = recurringMap.get(t.recurrenceId);
      if (rule && rule.recurrenceType === 'limited' && rule.recurrenceEndDate) {
        const start = parseISO(rule.startDate);
        const end = parseISO(rule.recurrenceEndDate);
        const total = rule.installmentsCount || (differenceInCalendarMonths(end, start) + 1);
        const num = differenceInCalendarMonths(parseISO(t.date), start) + 1;
        if (num >= 1 && num <= total) {
          await db.transactions.update(t.id, {
            installmentNumber: num,
            installmentTotal: total
          });
        }
      }
    }
  }
}

/**
 * Exclui a regra de recorrência e TODAS as transações vinculadas a ela em todos os meses.
 */
export async function deleteRecurringRuleAndTransactions(recurrenceId: string) {
  await db.transaction('rw', [db.recurringTransactions, db.transactions], async () => {
    await db.recurringTransactions.delete(recurrenceId);
    const linked = await db.transactions.where('recurrenceId').equals(recurrenceId).toArray();
    if (linked.length > 0) {
      await db.transactions.bulkDelete(linked.map(t => t.id));
    }
  });
}

/**
 * Exclui transações vinculadas a partir de uma data específica (atual e futuras)
 * e encerra a recorrência para não gerar mais instâncias.
 */
export async function deleteFutureRecurringTransactions(recurrenceId: string, fromDate: string) {
  await db.transaction('rw', [db.recurringTransactions, db.transactions], async () => {
    const futureTxs = await db.transactions
      .where('recurrenceId')
      .equals(recurrenceId)
      .filter(t => t.date >= fromDate)
      .toArray();

    if (futureTxs.length > 0) {
      await db.transactions.bulkDelete(futureTxs.map(t => t.id));
    }

    // Verifica se ainda restam transações passadas
    const remaining = await db.transactions
      .where('recurrenceId')
      .equals(recurrenceId)
      .toArray();

    if (remaining.length === 0) {
      await db.recurringTransactions.delete(recurrenceId);
    } else {
      // Ajusta a data final para a última transação restante
      const dates = remaining.map(t => t.date).sort();
      const lastDate = dates[dates.length - 1];
      await db.recurringTransactions.update(recurrenceId, {
        recurrenceType: 'limited',
        recurrenceEndDate: lastDate,
        lastGeneratedDate: lastDate,
      });
    }
  });
}
