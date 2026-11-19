import React, { useState } from 'react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@/lib/cfoResources';
import Dashboard from './Pages/Dashboard';

export interface AppProps {
  queryClient?: QueryClient;
}

export const App: React.FC<AppProps> = ({ queryClient: providedClient }) => {
  const [defaultClient] = useState(() => createAppQueryClient());
  const client = providedClient ?? defaultClient;

  return (
    <QueryClientProvider client={client}>
      <Dashboard />
    </QueryClientProvider>
  );
};

export default App;
