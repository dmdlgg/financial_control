import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CalendarView } from './pages/CalendarView';
import { ChartsView } from './pages/ChartsView';
import { SettingsView } from './pages/SettingsView';
import { AddTransaction } from './pages/AddTransaction';
import { BlockDetails } from './pages/BlockDetails';
import { TransactionListView } from './pages/TransactionListView';
import { ReceivablesDashboard } from './pages/ReceivablesDashboard';
import { ReceivablesCategory } from './pages/ReceivablesCategory';
import { ReceivablesDebtor } from './pages/ReceivablesDebtor';
import { ReceivablesDebt } from './pages/ReceivablesDebt';
import { ReceivablesHistory } from './pages/ReceivablesHistory';
import { ReceivablesNewCategory } from './pages/ReceivablesNewCategory';
import { ReceivablesNewDebtor } from './pages/ReceivablesNewDebtor';
import { ReceivablesNewDebt } from './pages/ReceivablesNewDebt';
import { useThemeStore } from './store/themeStore';
import { processRecurringTransactions } from './lib/recurrence';

function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    processRecurringTransactions().catch(console.error);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="charts" element={<ChartsView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="/receivables" element={<Layout />}>
          <Route index element={<ReceivablesDashboard />} />
          <Route path="category/:id" element={<ReceivablesCategory />} />
          <Route path="debtor/:id" element={<ReceivablesDebtor />} />
          <Route path="debt/:id" element={<ReceivablesDebt />} />
          <Route path="history" element={<ReceivablesHistory />} />
          <Route path="new-category" element={<ReceivablesNewCategory />} />
          <Route path="new-category/:id" element={<ReceivablesNewCategory />} />
          <Route path="new-debtor" element={<ReceivablesNewDebtor />} />
          <Route path="new-debtor/:id" element={<ReceivablesNewDebtor />} />
          <Route path="new-debt" element={<ReceivablesNewDebt />} />
          <Route path="new-debt/:id" element={<ReceivablesNewDebt />} />
        </Route>
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/edit/:id" element={<AddTransaction />} />
        <Route path="/block/:id" element={<BlockDetails />} />
        <Route path="/transactions" element={<TransactionListView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
