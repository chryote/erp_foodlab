import React, { useCallback, useEffect, useState } from 'react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { logout as logoutRequest } from '@/api/client';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '@/lib/authStorage';
import { createAppQueryClient } from '@/lib/cfoResources';
import Dashboard from './Pages/Dashboard';
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
    return <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <QueryClientProvider client={client}>
      <Dashboard onLogout={handleLogout} />
    </QueryClientProvider>
  );
};

export default App;
