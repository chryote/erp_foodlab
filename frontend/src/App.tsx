import React, { useState } from 'react';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@/lib/cfoResources';
import { Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './Pages/Login';
import FlowSimulator from './Pages/FlowSimulator';
import Dashboard from './Pages/Dashboard';
import PageNotFound from './Pages/PageNotFound';

export interface AppProps {
  queryClient?: QueryClient;
}

export const App: React.FC<AppProps> = ({ queryClient: providedClient }) => {
  const [defaultClient] = useState(() => createAppQueryClient());
  const client = providedClient ?? defaultClient;

  return (
    <>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/flow-simulator" element={<FlowSimulator />} />
          <Route path="/404" element={<PageNotFound />} />
          <Route path="*" element={<Navigate to="/404" />} />
        </Routes>
      </QueryClientProvider>
    </>
  );
};

export default App;
