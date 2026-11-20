import React, { useCallback, useEffect, useState } from 'react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { logout as logoutRequest } from '@/api/client';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '@/lib/authStorage';
import { createAppQueryClient } from '@/lib/cfoResources';
import { Route, Routes, Navigate } from 'react-router-dom';
import DashboardFlowSimulator from './Pages/DashboardFlowSimulator';
import Dashboard from './Pages/Dashboard';
import PageNotFound from './Pages/PageNotFound';
import { LoginPage } from './Pages/LoginPage';

export interface AppProps {
  queryClient?: QueryClient;
}

export const App: React.FC<AppProps> = ({ queryClient: providedClient }) => {
  const [defaultClient] = useState(() => createAppQueryClient());
  const client = providedClient ?? defaultClient;
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  useEffect(() => {
    const handleUnauthorized = () => setToken(null);
    window.addEventListener('erp:unauthorized', handleUnauthorized);

    return () => window.removeEventListener('erp:unauthorized', handleUnauthorized);
  }, []);

  const handleAuthenticated = useCallback(
    (nextToken: string) => {
      setAuthToken(nextToken);
      client.clear();
      setToken(nextToken);
    },
    [client]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The local session is cleared even if the API token was already revoked.
    }

    clearAuthToken();
    client.clear();
    setToken(null);
  }, [client]);

  if (!token) {
    return (
      <>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage onAuthenticated={handleAuthenticated} />} />
          <Route path="/404" element={<PageNotFound />} />
          <Route path="*" element={<Navigate to="/404" />} />
        </Routes>
      </QueryClientProvider>
    </>
    )
  }

  return (
    <>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard-flow-simulator" element={<DashboardFlowSimulator onLogout={handleLogout} />} />
          <Route path="/404" element={<PageNotFound />} />
          <Route path="*" element={<Navigate to="/404" />} />
        </Routes>
      </QueryClientProvider>
    </>
  );
};

export default App;
