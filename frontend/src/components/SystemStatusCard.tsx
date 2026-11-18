import React from 'react';
import type { HealthResponse } from '../api/client';

interface SystemStatusCardProps {
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({
  health,
  loading,
  error,
  onRefresh,
}) => {
  return (
    <section className="card" aria-label="System Infrastructure Status">
      <div className="card-header">
        <h2>Infrastructure &amp; Telemetry Status</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {health && (
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">API Overall</span>
            <span
              data-testid="overall-status"
              className={`badge ${health.status === 'ok' ? 'badge-ok' : 'badge-err'}`}
            >
              {health.status.toUpperCase()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">MySQL 8.0</span>
            <span
              data-testid="mysql-status"
              className={`badge ${health.checks.database === 'ok' ? 'badge-ok' : 'badge-err'}`}
            >
              {health.checks.database.toUpperCase()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Redis Cache</span>
            <span
              data-testid="redis-status"
              className={`badge ${health.checks.cache_redis === 'ok' ? 'badge-ok' : 'badge-err'}`}
            >
              {health.checks.cache_redis.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
