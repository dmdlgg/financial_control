import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CalendarView } from './pages/CalendarView';
import { ChartsView } from './pages/ChartsView';
import { SettingsView } from './pages/SettingsView';
import { AddTransaction } from './pages/AddTransaction';
import { BlockDetails } from './pages/BlockDetails';

function App() {
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
