import { useState, useEffect, useCallback } from 'react';
import { Rule } from '../../shared/types';
import { storage } from '../../shared/storage';

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await storage.getRules();
    setRules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return storage.onChanged(refresh);
  }, [refresh]);

  return { rules, loading, refresh };
}

export function useEnabled() {
  const [enabled, setEnabledState] = useState(true);

  const refresh = useCallback(async () => {
    const val = await storage.getEnabled();
    setEnabledState(val);
  }, []);

  useEffect(() => {
    refresh();
    return storage.onChanged(refresh);
  }, [refresh]);

  const toggle = useCallback(async () => {
    await storage.setEnabled(!enabled);
  }, [enabled]);

  return { enabled, toggle };
}
