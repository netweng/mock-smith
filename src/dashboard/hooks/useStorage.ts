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
