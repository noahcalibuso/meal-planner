import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { StoreProvider } from './lib/store';
import { LibraryPage } from './pages/LibraryPage';
import { OutputsPage } from './pages/OutputsPage';
import { PlannerPage } from './pages/PlannerPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/planner" replace />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="outputs" element={<OutputsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/planner" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
