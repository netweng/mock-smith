import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { RulesDashboard } from './pages/RulesDashboard';
import { TrafficLogs } from './pages/TrafficLogs';
import { EditRule } from './pages/EditRule';
import { RoutePath } from '../shared/types';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-background">
        <Routes>
          <Route
            path={RoutePath.DASHBOARD}
            element={
              <>
                <Sidebar />
                <RulesDashboard />
              </>
            }
          />
          <Route
            path={RoutePath.LOGS}
            element={
              <>
                <Sidebar />
                <TrafficLogs />
              </>
            }
          />
          <Route path="/edit/:id?" element={<EditRule />} />
          <Route
            path="*"
            element={<Navigate to={RoutePath.DASHBOARD} replace />}
          />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
