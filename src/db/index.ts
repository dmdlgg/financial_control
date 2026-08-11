import Dexie, { type EntityTable } from 'dexie';

export type TransactionType = 'expense' | 'income';
export type TransactionStatus = 'completed' | 'planned';
export type PeriodType = 'monthly' | 'weekly';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  blockId?: string;
  description?: string;
  status: TransactionStatus;
  recurrenceId?: string;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  startDate: string; // YYYY-MM-DD
  blockId?: string;
  description?: string;
  status: TransactionStatus;
  recurrenceType: 'indefinite' | 'limited';
  recurrenceEndDate?: string;
  lastGeneratedDate?: string;
}

export interface Block {
  id: string;
  name: string;
  totalAmount: number;
  period: PeriodType;
  weeklyLimit?: number;
  order?: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
}

export interface ReceivableCategory {
  id: string;
  name: string;
  color?: string;
  createdAt: string; // ISO date
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
  startMonth: string; // YYYY-MM
  createdAt: string;
  settledAt?: string;
}

export interface ReceivableInstallment {
  id: string;
  debtId: string;
  month: string; // YYYY-MM
  number: number; // 1, 2, 3...
  expectedAmount: number;
  paidAmount?: number;
  paidAt?: string; // ISO date
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

// Schema declaration
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

export { db };
