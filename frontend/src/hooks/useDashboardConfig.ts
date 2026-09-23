import { useState, useEffect } from 'react';
import {
  DashboardControlService,
  StudentDashboardConfig,
} from '../services/dashboardControl';

export function useDashboardConfig() {
  const [config, setConfig] = useState<StudentDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    DashboardControlService.getConfig().then((cfg) => {
      if (!cancelled) {
        setConfig(cfg);
        setLoading(false);
      }
    });

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<StudentDashboardConfig>;
      if (customEvent.detail && !cancelled) {
        setConfig(customEvent.detail);
      }
    };

    window.addEventListener('ncert_dashboard_config_updated', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('ncert_dashboard_config_updated', handler);
    };
  }, []);

  return { config, loading };
}
