import React from 'react';
import type { HealthResponse } from '../api/client';
import { Badge, Button, Card, CardHeader } from './ui';

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
    <Card aria-label="System Infrastructure Status">
      <CardHeader
        title="Infrastructure & Telemetry Status"
        actions={
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            {loading ? 'Checking...' : 'Refresh Status'}
          </Button>
        }
      />

      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      {health && (
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">API Overall</span>
            <Badge
              data-testid="overall-status"
              variant={health.status === 'ok' ? 'ok' : 'err'}
            >
              {health.status.toUpperCase()}
            </Badge>
          </div>
          <div className="status-item">
            <span className="status-label">MySQL 8.0</span>
            <Badge
              data-testid="mysql-status"
              variant={health.checks.database === 'ok' ? 'ok' : 'err'}
            >
              {health.checks.database.toUpperCase()}
            </Badge>
          </div>
          <div className="status-item">
            <span className="status-label">Redis Cache</span>
            <Badge
              data-testid="redis-status"
              variant={health.checks.cache_redis === 'ok' ? 'ok' : 'err'}
            >
              {health.checks.cache_redis.toUpperCase()}
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
};
