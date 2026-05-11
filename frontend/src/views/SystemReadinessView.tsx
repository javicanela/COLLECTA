import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Topbar from '../components/Topbar';
import { Button } from '../components/ui/Button';
import { ConnectivityTestPanel } from '../components/system/ConnectivityTestPanel';
import { IntegrationStatusGrid } from '../components/system/IntegrationStatusGrid';
import {
  ReadinessChecklist,
  buildReadinessItems,
  getReadinessSummary,
  type ReadinessItemStatus,
} from '../components/system/ReadinessChecklist';
import { DiagnosticsService } from '../services/diagnosticsService';
import type { DiagnosticsReadinessResponse } from '../types';

function getOverallStatus(summary: ReturnType<typeof getReadinessSummary>): ReadinessItemStatus {
  if (summary.error > 0) return 'error';
  if (summary.warning > 0) return 'warning';
  if (summary.notConfigured > 0) return 'not_configured';
  if (summary.unverified > 0) return 'unverified';
  return 'ok';
}

export default function SystemReadinessView() {
  const [readiness, setReadiness] = useState<DiagnosticsReadinessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchReadiness = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await DiagnosticsService.getE2EReadiness();
      setReadiness(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el diagnostico.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReadiness();
  }, [fetchReadiness]);

  const readinessItems = useMemo(
    () => (readiness ? buildReadinessItems(readiness) : []),
    [readiness],
  );
  const summary = useMemo(() => getReadinessSummary(readinessItems), [readinessItems]);
  const overallStatus = getOverallStatus(summary);
  const generatedAt = readiness?.generatedAt || readiness?.updatedAt || lastUpdated;

  return (
    <>
      <Topbar
        title="Diagnostico del sistema"
        subtitle="Checklist de readiness, integraciones y fallback operativo"
        actions={
          <Button
            variant="ghost"
            size="sm"
            loading={isLoading}
            onClick={() => void fetchReadiness()}
            leftIcon={<RefreshCw size={14} />}
          >
            Refrescar
          </Button>
        }
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-5 lg:p-6">
        <ConnectivityTestPanel
          summary={summary}
          overallStatus={error && !readiness ? 'error' : overallStatus}
          generatedAt={generatedAt}
          environment={readiness?.environment}
          isLoading={isLoading}
          error={error}
          onRefresh={() => void fetchReadiness()}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <ReadinessChecklist items={readinessItems} isLoading={isLoading} />
          <IntegrationStatusGrid items={readinessItems} />
        </div>
      </div>
    </>
  );
}
