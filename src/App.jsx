import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Base44Provider } from '@/lib/base44-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { EntitiesPage } from '@/pages/EntitiesPage';
import { RecordsPage } from '@/pages/RecordsPage';
import { AgentsPage } from '@/pages/AgentsPage';
import { TasksPage } from '@/pages/TasksPage';
import { MasterActionPacketsPage } from '@/pages/MasterActionPacketsPage';
import { GetPaidPage } from '@/pages/GetPaidPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <Base44Provider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/entities" element={<EntitiesPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/map" element={<MasterActionPacketsPage />} />
            <Route path="/get-paid" element={<GetPaidPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </Base44Provider>
  );
}

export default App;
