import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchHealthStatus,
  fetchLabSamples,
  type HealthResponse,
  type LabSample,
} from './api/client';
import { SystemStatusCard } from './components/SystemStatusCard';
import { LabSampleTable } from './components/LabSampleTable';
import './App.css';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, samplesData] = await Promise.all([
        fetchHealthStatus(),
        fetchLabSamples(),
      ]);
      setHealth(healthData);
      setSamples(samplesData.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach ERP FoodLab API'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>ERP FoodLab Console</h1>
          <p className="subtitle">
            Laravel 11 API &bull; React &bull; MySQL 8.0 &bull; Redis &bull; k6 &bull; Prometheus &amp; Grafana
          </p>
        </div>
        <nav className="external-links" aria-label="Observability Links">
          <a
            href={import.meta.env.VITE_PROMETHEUS_URL || 'http://localhost:9090'}
            target="_blank"
            rel="noreferrer"
          >
            Prometheus
          </a>
          <a
            href={import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000'}
            target="_blank"
            rel="noreferrer"
          >
            Grafana Dashboard
          </a>
        </nav>
      </header>

      <main className="main-grid">
        <SystemStatusCard
          health={health}
          loading={loading}
          error={error}
          onRefresh={loadDashboardData}
        />
        <LabSampleTable samples={samples} />
      </main>
    </div>
  );
};

export default App;
