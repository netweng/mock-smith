import { useState, useEffect, useCallback, useRef } from 'react';
import { TrafficLogEntry } from '../../shared/types';
import { storage } from '../../shared/storage';

const POLL_INTERVAL = 2000;

export function useLogs() {
  const [logs, setLogs] = useState<TrafficLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    const data = await storage.getLogs();
    setLogs(data);
    setLoading(false);
  }, []);

  const clear = useCallback(async () => {
    await storage.clearLogs();
    setLogs([]);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { logs, loading, refresh, clear };
}
