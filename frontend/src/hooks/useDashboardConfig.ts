import { useState, useEffect } from 'react';
import {
  DashboardControlService,
  StudentDashboardConfig,
} from '../services/dashboardControl';
import { getSocket } from '../services/socket';

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

    // Admin saved the dashboard config from another browser: the server broadcasts the key.
    const socket = getSocket();
    const onSettings = (key: string) => {
      if (key === 'student_dashboard') DashboardControlService.getConfig().then((cfg) => !cancelled && setConfig(cfg));
    };

    window.addEventListener('ncert_dashboard_config_updated', handler);
    socket.on('settings:changed', onSettings);
    return () => {
      cancelled = true;
      window.removeEventListener('ncert_dashboard_config_updated', handler);
      socket.off('settings:changed', onSettings);
    };
  }, []);

  return { config, loading };
}
