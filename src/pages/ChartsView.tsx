import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ChartsView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const transactions = useLiveQuery(
    () => db.transactions
      .where('date')
      .between(start, end, true, true)
      .toArray(),
    [start, end]
  ) || [];

  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];

  const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'completed');

  // Prepare data for Pie Chart (Expenses by Category)
  const expensesByCategory = expenses.reduce((acc, curr) => {
    const cat = categories.find(c => c.id === curr.categoryId);
    const catName = cat?.name || 'Sem Categoria';
    if (!acc[catName]) {
      acc[catName] = { value: 0, color: cat?.color || '#94a3b8' };
    }
    acc[catName].value += curr.amount;
    return acc;
  }, {} as Record<string, { value: number, color: string }>);

  const pieData = Object.entries(expensesByCategory).map(([name, data]) => ({
    name, value: data.value, color: data.color
  }));

  // Prepare data for Bar Chart (Blocks: Budget vs Spent)
  const barData = blocks.map(block => {
    const spent = expenses.filter(e => e.blockId === block.id).reduce((acc, curr) => acc + curr.amount, 0);
    return {
      name: block.name,
      Orçamento: block.totalAmount,
      Gasto: spent
    };
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <header className="p-4 sm:p-6 pb-2">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Gráficos</h1>

        <div className="flex items-center justify-between mb-4 bg-bg-elevated p-2 rounded-2xl border border-border">
          <button onClick={prevMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-text-primary capitalize tracking-wide">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-bg-surface rounded-xl text-text-secondary transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-8 no-scrollbar">
        {/* Gráfico de Categorias */}
        <section className="bg-bg-elevated p-5 rounded-3xl border border-border shadow-md">
          <h2 className="text-xs font-bold text-text-secondary mb-4 uppercase tracking-widest">Despesas por Categoria</h2>
          {pieData.length === 0 ? (
            <div className="text-center p-8 bg-bg-surface rounded-2xl border border-border border-dashed">
              <p className="text-text-secondary text-sm">Nenhuma despesa neste mês.</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                    contentStyle={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', borderRadius: '16px', color: 'var(--color-text-primary)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                    itemStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: 'var(--color-text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Gráfico de Blocos */}
        <section className="bg-bg-elevated p-5 rounded-3xl border border-border shadow-md">
          <h2 className="text-xs font-bold text-text-secondary mb-4 uppercase tracking-widest">Orçamento vs Gasto</h2>
          {barData.length === 0 ? (
            <div className="text-center p-8 bg-bg-surface rounded-2xl border border-border border-dashed">
              <p className="text-text-secondary text-sm">Nenhum bloco de orçamento configurado.</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip
                    formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                    cursor={{ fill: 'var(--color-border)', opacity: 0.5 }}
                    contentStyle={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', borderRadius: '16px', color: 'var(--color-text-primary)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                    itemStyle={{ fontWeight: 600, color: 'var(--color-text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '15px', color: 'var(--color-text-primary)' }} />
                  <Bar dataKey="Orçamento" fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Gasto" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
