import React from 'react';
import ReactDOM from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import App from './App';
import Dashboard from './Pages/Dashboard';

const inertiaRoot = document.getElementById('app');

if (inertiaRoot && inertiaRoot.hasAttribute('data-page')) {
  const pages: Record<string, React.ComponentType<Record<string, unknown>>> = {
    Dashboard: Dashboard as React.ComponentType<Record<string, unknown>>,
  };

  void createInertiaApp({
    resolve: (name) => pages[name] ?? Dashboard,
    setup({ el, App: InertiaApp, props }) {
      ReactDOM.createRoot(el).render(
        <React.StrictMode>
          <InertiaApp {...props} />
        </React.StrictMode>
      );
    },
  });
} else {
  const rootEl = document.getElementById('root') ?? inertiaRoot;
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
