import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import App from './App';
import './App.css';
import { initializeTheme } from './lib/theme';

const rootEl = document.getElementById('root') ?? document.getElementById('app');

if (rootEl) {
  initializeTheme();
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
