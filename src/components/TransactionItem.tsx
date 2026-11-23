import { cn, formatCurrencyInput } from '../lib/utils';
import { type Transaction, type Category, type Block } from '../db';
import { Layers } from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  block?: Block;
  onClick?: () => void;
  className?: string;
}

export function TransactionItem({ transaction: t, category, block, onClick, className }: TransactionItemProps) {
  const color = category?.color || (t.type === 'income' ? '#10b981' : '#ef4444');
  const isInstallment = t.installmentNumber != null && t.installmentTotal != null && t.installmentTotal > 1;
  const installmentPercent = isInstallment ? Math.min(100, Math.round((t.installmentNumber! / t.installmentTotal!) * 100)) : 0;

  return (
    <li
      onClick={onClick}
      className={cn(
        "bg-bg-elevated p-4 rounded-3xl border border-border flex flex-col gap-2.5 shadow-md transition-all hover:scale-[1.01] cursor-pointer",
        className
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-text-primary truncate">
                {t.description || category?.name || 'Transação'}
              </span>

              {t.status === 'planned' && (
                <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Planejado
                </span>
              )}

              {block && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border flex items-center gap-1 font-medium">
                  <Layers className="w-2.5 h-2.5" />
                  {block.name}
                </span>
              )}
            </div>

            <div className="text-xs text-text-secondary mt-0.5 flex items-center gap-2">
              <span>{category?.name || 'Sem categoria'}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className={cn("font-bold text-base", t.type === 'income' ? 'text-success' : 'text-danger')}>
            {t.type === 'income' ? '+' : '-'} {formatCurrencyInput(Math.round(t.amount * 100).toString())}
          </p>
        </div>
      </div>

      {/* Barra colorida de progresso da parcela */}
      {isInstallment && (
        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="h-2 flex-1 bg-bg-surface rounded-full overflow-hidden border border-border/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  t.installmentNumber === t.installmentTotal
                    ? "bg-success"
                    : installmentPercent > 50
                    ? "bg-accent"
                    : "bg-amber-500"
                )}
                style={{ width: `${installmentPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-text-secondary shrink-0">
              {t.installmentNumber}/{t.installmentTotal}
            </span>
          </div>

          <span className="text-[10px] font-medium text-text-secondary shrink-0">
            {installmentPercent}% quitado
          </span>
        </div>
      )}
    </li>
  );
}
