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
};

// Schema declaration
db.version(2).stores({
  transactions: 'id, type, categoryId, date, blockId, status',
  blocks: 'id, name, period, order',
  categories: 'id, name, type'
});

export { db };
