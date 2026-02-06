import { useState, useEffect, useCallback } from 'react';
import { TrafficLogEntry } from '../../shared/types';
import { storage } from '../../shared/storage';

const isChromeExtension =
  typeof chrome !== 'undefined' && !!chrome?.runtime?.onMessage;

export function useLogs() {
  const [logs, setLogs] = useState<TrafficLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

    if (!isChromeExtension) return;

    // Listen for real-time log pushes from service worker
    const listener = (message: any) => {
      if (message.type === 'LOG_ADDED' && message.entry) {
        setLogs((prev) => [message.entry, ...prev]);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  return { logs, loading, refresh, clear };
}
