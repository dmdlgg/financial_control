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
import { useThemeStore } from './store/themeStore';

function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
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
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/edit/:id" element={<AddTransaction />} />
        <Route path="/block/:id" element={<BlockDetails />} />
        <Route path="/transactions" element={<TransactionListView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
