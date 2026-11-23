import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { format, parseISO, differenceInCalendarMonths, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, Layers, Calendar, ChevronRight, CheckCircle2, Clock, Plus, Trash2, ChevronDown, Star } from 'lucide-react';
import { formatCurrencyInput, cn } from '../lib/utils';
import { deleteRecurringRuleAndTransactions } from '../lib/recurrence';

export function InstallmentsView() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
  const recurringRules = useLiveQuery(
    () => db.recurringTransactions.where('recurrenceType').equals('limited').toArray()
  ) || [];

  const now = new Date();

  // Processa e enriquece os dados das parcelas
  const installmentPlans = useMemo(() => {
    return recurringRules.map(rule => {
      const start = parseISO(rule.startDate);
      const end = rule.recurrenceEndDate ? parseISO(rule.recurrenceEndDate) : start;
      const total = rule.installmentsCount || Math.max(1, differenceInCalendarMonths(end, start) + 1);

      // Parcela atual com base no mês corrente
      const currentDiff = differenceInCalendarMonths(now, start);
      let currentNumber = currentDiff + 1;
      if (currentNumber < 1) currentNumber = 1;
      if (currentNumber > total) currentNumber = total;

      // Quitada = o mês da última parcela já PASSOU (início do próximo mês após end)
      const endMonthStart = startOfMonth(end);
      const nowMonthStart = startOfMonth(now);
      const isFinished = isBefore(endMonthStart, nowMonthStart);

      // Última parcela este mês = estamos no mesmo mês da última parcela, mas ela ainda não passou
      const isLastInstallmentThisMonth = !isFinished && currentNumber >= total;
      const progressPercent = Math.min(100, Math.round((currentNumber / total) * 100));
      const totalAmount = rule.amount * total;
      const paidAmount = currentNumber * rule.amount;
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const remainingCount = Math.max(0, total - currentNumber);

      const category = categories.find(c => c.id === rule.categoryId);
      const block = blocks.find(b => b.id === rule.blockId);

      // Paleta de fallback por índice, para categorias sem cor definida no banco
      const FALLBACK_COLORS = ['#6366f1','#f97316','#ec4899','#14b8a6','#8b5cf6','#3b82f6','#ef4444','#f59e0b'];
      const categoryIndex = categories.findIndex(c => c.id === rule.categoryId);
      const resolvedColor = category?.color || FALLBACK_COLORS[Math.abs(categoryIndex) % FALLBACK_COLORS.length] || '#6366f1';

      return {
        rule,
        category,
        block,
        start,
        end,
        totalInstallments: total,
        currentInstallmentNumber: currentNumber,
        isFinished,
        isLastInstallmentThisMonth,
        progressPercent,
        monthlyAmount: rule.amount,
        totalAmount,
        paidAmount,
        remainingAmount,
        remainingCount,
        resolvedColor,
      };
    });
  }, [recurringRules, categories, blocks]);

  // Filtra de acordo com a aba selecionada
  const filteredPlans = useMemo(() => {
    if (filter === 'active') return installmentPlans.filter(p => !p.isFinished);
    if (filter === 'completed') return installmentPlans.filter(p => p.isFinished);
    return installmentPlans;
  }, [installmentPlans, filter]);

  // Agrupa os parcelamentos por categoria
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, {
      category: typeof categories[0] | undefined;
      plans: typeof filteredPlans;
      totalMonthly: number;
      totalRemaining: number;
    }> = {};

    for (const plan of filteredPlans) {
      const catId = plan.category?.id || 'uncategorized';
      if (!groups[catId]) {
        groups[catId] = {
          category: plan.category,
          plans: [],
          totalMonthly: 0,
          totalRemaining: 0,
        };
      }
      groups[catId].plans.push(plan);
      groups[catId].totalMonthly += plan.monthlyAmount;
      groups[catId].totalRemaining += plan.remainingAmount;
    }

    return Object.values(groups);
  }, [filteredPlans]);

  // Totais gerais para os cards do topo
  const summary = useMemo(() => {
    const activePlans = installmentPlans.filter(p => !p.isFinished);
    const totalRemaining = activePlans.reduce((acc, p) => acc + p.remainingAmount, 0);
    const totalMonthly = activePlans.reduce((acc, p) => acc + p.monthlyAmount, 0);
    const totalPaid = installmentPlans.reduce((acc, p) => acc + p.paidAmount, 0);

    return {
      totalRemaining,
      totalMonthly,
      totalPaid,
      activeCount: activePlans.length,
      totalCount: installmentPlans.length,
    };
  }, [installmentPlans]);

  const handleDeletePlan = async (recurrenceId: string) => {
    if (confirm('Tem certeza que deseja excluir este parcelamento e TODAS as suas parcelas em todos os meses?')) {
      await deleteRecurringRuleAndTransactions(recurrenceId);
    }
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const collapseAll = () => {
    const allIds = new Set(groupedByCategory.map(g => g.category?.id || 'uncategorized'));
    setCollapsedCategories(allIds);
  };

  const expandAll = () => {
    setCollapsedCategories(new Set());
  };

  return (
    <div className="p-4 sm:p-6 pb-24 bg-bg-primary">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-accent" />
            Minhas Parcelas
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Visão consolidada de todas as compras parceladas separadas por categoria
          </p>
        </div>

        <button
          onClick={() => navigate('/add')}
          className="p-2 rounded-xl bg-accent text-accent-inverse hover:opacity-90 active:scale-95 transition-all shadow-sm"
          title="Nova Parcela"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-bg-elevated p-4 rounded-3xl border border-border shadow-sm">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Restante a Pagar
          </p>
          <p className="text-xl font-bold text-danger">
            {formatCurrencyInput(Math.round(summary.totalRemaining * 100).toString())}
          </p>
          <p className="text-[11px] text-text-secondary mt-1">
            {summary.activeCount} {summary.activeCount === 1 ? 'parcelamento ativo' : 'parcelamentos ativos'}
          </p>
        </div>

        <div className="bg-bg-elevated p-4 rounded-3xl border border-border shadow-sm">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Compromisso Mensal
          </p>
          <p className="text-xl font-bold text-accent">
            {formatCurrencyInput(Math.round(summary.totalMonthly * 100).toString())}
          </p>
          <p className="text-[11px] text-text-secondary mt-1">
            Total somado por mês
          </p>
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex bg-bg-elevated p-1 rounded-2xl border border-border mb-6">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-xl transition-all",
            filter === 'all'
              ? "bg-accent text-accent-inverse shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          Todas ({installmentPlans.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-xl transition-all",
            filter === 'active'
              ? "bg-accent text-accent-inverse shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          Em Aberto ({summary.activeCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-xl transition-all",
            filter === 'completed'
              ? "bg-accent text-accent-inverse shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          Quitadas ({installmentPlans.length - summary.activeCount})
        </button>
      </div>

      {/* Listagem agrupada por categoria */}
      {groupedByCategory.length === 0 ? (
        <div className="text-center p-8 bg-bg-elevated rounded-3xl border border-border border-dashed">
          <CreditCard className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-text-primary">Nenhuma parcela encontrada</h3>
          <p className="text-xs text-text-secondary mt-1">
            {filter !== 'all'
              ? 'Não há parcelas correspondentes a este filtro.'
              : 'Você ainda não possui transações configuradas com limite de parcelas.'}
          </p>
          <button
            onClick={() => navigate('/add')}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-accent text-accent-inverse rounded-xl hover:opacity-90 transition-opacity"
          >
            + Cadastrar Nova Parcela
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Barra de ação rápida para retrair/expandir todas */}
          <div className="flex items-center justify-between text-xs text-text-secondary px-1 -mt-2 mb-2">
            <span>
              {groupedByCategory.length} {groupedByCategory.length === 1 ? 'categoria' : 'categorias'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="hover:text-accent font-semibold transition-colors"
              >
                Expandir todas
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-accent font-semibold transition-colors"
              >
                Recolher todas
              </button>
            </div>
          </div>

          {groupedByCategory.map(({ category, plans, totalMonthly, totalRemaining }) => {
            const catId = category?.id || 'uncategorized';
            const isCollapsed = collapsedCategories.has(catId);
            // Usa a cor resolvida do primeiro plano do grupo (já tem fallback garantido)
            const catColor = plans[0]?.resolvedColor || '#6366f1';

            return (
              <section key={catId} className="space-y-3">
                {/* Cabeçalho da Categoria com Retração */}
                <div
                  onClick={() => toggleCategory(catId)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-bg-elevated hover:bg-bg-elevated/80 border border-border cursor-pointer transition-all select-none group shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-text-secondary transition-transform duration-200 shrink-0",
                        isCollapsed ? "-rotate-90" : "rotate-0 text-accent"
                      )}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <h2 className="text-base font-bold text-text-primary truncate">
                      {category?.name || 'Sem Categoria'}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border/60 shrink-0 font-medium">
                      {plans.length}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-accent">
                      {formatCurrencyInput(Math.round(totalMonthly * 100).toString())}/mês
                    </p>
                    {totalRemaining > 0 && (
                      <p className="text-[10px] text-text-secondary font-medium">
                        Restam {formatCurrencyInput(Math.round(totalRemaining * 100).toString())}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cards das parcelas dentro desta categoria */}
                {!isCollapsed ? (
                  <div className="space-y-3.5 pl-1 sm:pl-2 animate-in fade-in duration-200">
                    {plans.map(plan => {
                      return (
                      <div
                        key={plan.rule.id}
                        className="bg-bg-elevated p-4 sm:p-5 rounded-3xl border border-border shadow-md transition-all hover:scale-[1.01] space-y-3 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-text-primary text-base truncate">
                                {plan.rule.description || 'Compra Parcelada'}
                              </h3>

                              {plan.block && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border flex items-center gap-1 font-medium">
                                  <Layers className="w-2.5 h-2.5" />
                                  {plan.block.name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-text-secondary/70" />
                                {format(plan.start, 'MMM/yy', { locale: ptBR })} até {format(plan.end, 'MMM/yy', { locale: ptBR })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-bold text-base text-text-primary">
                              {formatCurrencyInput(Math.round(plan.monthlyAmount * 100).toString())}
                              <span className="text-xs text-text-secondary font-normal"> /mês</span>
                            </p>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1",
                                plan.isFinished
                                  ? "bg-success/15 text-success border border-success/30"
                                  : plan.isLastInstallmentThisMonth
                                  ? "bg-amber-400/15 text-amber-500 border border-amber-400/30"
                                  : "bg-accent/15 text-accent border border-accent/30"
                              )}
                            >
                              {plan.isFinished ? (
                                <>
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Quitado
                                </>
                              ) : plan.isLastInstallmentThisMonth ? (
                                <>
                                  <Star className="w-2.5 h-2.5" /> Última parcela este mês
                                </>
                              ) : (
                                <>
                                  <Clock className="w-2.5 h-2.5" /> Em andamento
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Barra Colorida de Progresso da Parcela */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-text-primary">
                              Parcela {plan.currentInstallmentNumber} de {plan.totalInstallments}
                            </span>
                            <span className="font-bold" style={{ color: plan.isFinished ? '#10b981' : plan.isLastInstallmentThisMonth ? '#f59e0b' : plan.resolvedColor }}>
                              {plan.progressPercent}% quitado
                            </span>
                          </div>

                          <div className="h-2.5 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${plan.progressPercent}%`,
                                backgroundColor: plan.isFinished
                                  ? '#10b981'
                                  : plan.isLastInstallmentThisMonth
                                  ? '#f59e0b'
                                  : plan.resolvedColor,
                              }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[11px] text-text-secondary pt-0.5">
                            <span>
                              Total: {formatCurrencyInput(Math.round(plan.totalAmount * 100).toString())}
                            </span>
                            <span>
                              {plan.isFinished
                                ? 'Totalmente pago'
                                : plan.isLastInstallmentThisMonth
                                ? 'Última parcela este mês 🎉'
                                : `${formatCurrencyInput(Math.round(plan.remainingAmount * 100).toString())} restantes (${plan.remainingCount}x)`}
                            </span>
                          </div>
                        </div>

                        {/* Ações do Card */}
                        <div className="pt-2 border-t border-border/50 flex justify-between items-center gap-2">
                          <button
                            onClick={() => navigate(`/edit-recurrence/${plan.rule.id}`)}
                            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                          >
                            Gerenciar parcelamento
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeletePlan(plan.rule.id)}
                            className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                            title="Excluir este parcelamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => toggleCategory(catId)}
                    className="py-1 px-3 text-xs text-text-secondary/70 hover:text-text-primary cursor-pointer text-center"
                  >
                    <span className="text-[11px] italic">
                      (Clique para expandir {plans.length} {plans.length === 1 ? 'parcela' : 'parcelas'})
                    </span>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
