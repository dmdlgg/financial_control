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

const db = new Dexie('ControleFinanceiroDB') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  blocks: EntityTable<Block, 'id'>;
  categories: EntityTable<Category, 'id'>;
  recurringTransactions: EntityTable<RecurringTransaction, 'id'>;
};

// Schema declaration
db.version(3).stores({
  transactions: 'id, type, categoryId, date, blockId, status, recurrenceId',
  blocks: 'id, name, period, order',
  categories: 'id, name, type',
  recurringTransactions: 'id, type, categoryId, startDate, status, recurrenceType'
});

export { db };
