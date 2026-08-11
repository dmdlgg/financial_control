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
