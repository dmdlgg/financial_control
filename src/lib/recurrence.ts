import { db } from '../db';
import { addMonths, format, parseISO, isBefore, isSameDay } from 'date-fns';

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

    let nextDate = rt.lastGeneratedDate ? addMonths(lastGenerated, 1) : lastGenerated;
    let newGeneratedDate = rt.lastGeneratedDate;
    let transactionsToAdd = [];

    while (isBefore(nextDate, limitDate) || isSameDay(nextDate, limitDate)) {
      const dateStr = format(nextDate, 'yyyy-MM-dd');
      
      transactionsToAdd.push({
        id: crypto.randomUUID(),
        type: rt.type,
        amount: rt.amount,
        categoryId: rt.categoryId,
        date: dateStr,
        blockId: rt.blockId,
        description: rt.description,
        status: rt.status,
        recurrenceId: rt.id
      });

      newGeneratedDate = dateStr;
      nextDate = addMonths(nextDate, 1);
    }

    if (transactionsToAdd.length > 0) {
      await db.transactions.bulkAdd(transactionsToAdd);
      await db.recurringTransactions.update(rt.id, { lastGeneratedDate: newGeneratedDate });
    }
  }

  // Cleanup potential duplicates caused by previous bug
  const allTransactions = await db.transactions.toArray();
  const seen = new Set();
  const duplicatesToDelete = [];
  
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
}
