import React, { useState, useEffect, useCallback } from 'react';
import { Rule, TrafficLogEntry } from '../shared/types';
import { storage } from '../shared/storage';

const isChromeExtension =
  typeof chrome !== 'undefined' && !!chrome?.tabs?.query;

const getMethodColor = (method: string) => {
  switch (method?.toUpperCase()) {
    case 'GET': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'POST': return 'bg-green-50 text-green-600 border-green-100';
    case 'PUT': return 'bg-orange-50 text-orange-600 border-orange-100';
    case 'PATCH': return 'bg-purple-50 text-purple-600 border-purple-100';
    case 'DELETE': return 'bg-rose-50 text-rose-600 border-rose-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

export const Popup: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-tab state
  const [tabId, setTabId] = useState<number | null>(null);
  const [tabEnabled, setTabEnabled] = useState(true);
  const [tabInjectable, setTabInjectable] = useState(true);

  // Hit counts per ruleId (filtered by current tab)
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const r = await storage.getRules();
    setRules(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return storage.onChanged(refresh);
  }, [refresh]);

  // Get current tab info
  useEffect(() => {
    if (!isChromeExtension) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;

      const injectable =
        !!tab.url &&
        (tab.url.startsWith('http://') || tab.url.startsWith('https://'));
      setTabId(tab.id);
      setTabInjectable(injectable);

      if (injectable) {
        chrome.runtime.sendMessage(
          { type: 'GET_TAB_ENABLED', tabId: tab.id },
          (response) => {
            setTabEnabled(response?.enabled !== false);
          },
        );
      }
    });
  }, []);

  // Compute hit counts from logs
  const computeHitCounts = useCallback((logs: TrafficLogEntry[], tid: number | null) => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      if (tid !== null && log.tabId !== tid) continue;
      counts[log.ruleId] = (counts[log.ruleId] || 0) + 1;
    }
    setHitCounts(counts);
  }, []);

  // Load initial logs + listen for LOG_ADDED (re-run when tabId becomes available)
  useEffect(() => {
    if (!isChromeExtension) return;

    // Fetch existing logs (re-computes when tabId changes)
    storage.getLogs().then((logs) => {
      computeHitCounts(logs, tabId);
    });

    // Listen for new log entries
    const listener = (message: any) => {
      if (message.type === 'LOG_ADDED' && message.entry) {
        const entry = message.entry as TrafficLogEntry;
        if (tabId !== null && entry.tabId !== tabId) return;
        setHitCounts((prev) => ({
          ...prev,
          [entry.ruleId]: (prev[entry.ruleId] || 0) + 1,
        }));
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [computeHitCounts, tabId]);

  const handleToggleTab = () => {
    if (tabId === null || !tabInjectable) return;
    const newEnabled = !tabEnabled;
    setTabEnabled(newEnabled);
    chrome.runtime.sendMessage({
      type: 'SET_TAB_ENABLED',
      tabId,
      enabled: newEnabled,
    });
  };

  const handleToggleRule = async (id: string) => {
    await storage.toggleRule(id);
  };

  const openDashboard = () => {
    chrome.runtime.openOptionsPage();
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const effectiveActive = tabEnabled && tabInjectable;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <span className="text-sm text-paragraph">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="flex flex-col gap-4 px-5 py-5 border-b border-border-light bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 flex items-center justify-center bg-primary rounded-lg shadow-sm shadow-primary/20">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>architecture</span>
            </div>
            <h1 className="text-headline text-lg font-bold leading-tight tracking-tight font-display">MockSmith</h1>
          </div>

          {/* Per-Tab Switch */}
          {isChromeExtension && (
            <div className="flex items-center gap-2">
              {!tabInjectable && (
                <span className="text-[10px] text-paragraph">N/A</span>
              )}
              <label className={`relative inline-flex items-center ${tabInjectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={tabEnabled}
                  onChange={handleToggleTab}
                  disabled={!tabInjectable}
                  className="sr-only peer"
                />
                <div className={`w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-colors`}></div>
                <div className={`absolute left-0 top-0 bg-white w-5 h-5 rounded-full border border-gray-300 shadow-sm transition-transform peer-checked:translate-x-full peer-checked:border-primary`}></div>
              </label>
            </div>
          )}
        </div>
      </header>

      {/* All Rules List */}
      {rules.length > 0 && (
        <div className={`px-3 py-2 max-h-[320px] overflow-y-auto transition-opacity ${!effectiveActive ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="text-xs font-bold text-secondary uppercase tracking-wider px-2 mb-2">All Rules</h3>
          <div className="flex flex-col gap-2">
            {rules.map((rule) => {
              const count = hitCounts[rule.id] || 0;
              return (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-3 rounded-lg border bg-white transition-colors shadow-sm ${
                    rule.enabled
                      ? 'border-secondary/20 hover:border-primary/30 hover:bg-primary/5'
                      : 'border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                        rule.type === 'graphql'
                          ? 'bg-primary/20 text-primary border-primary/30'
                          : getMethodColor(rule.match.method || 'ANY')
                      }`}>
                        {rule.type === 'graphql' ? 'GQL' : (rule.match.method || 'ANY')}
                      </span>
                      <span className="text-headline text-sm font-bold truncate">{rule.name}</span>
                    </div>
                    <p className="text-xs text-paragraph truncate font-mono">{rule.match.url}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Hit count badge */}
                    <span className={`text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 ${
                      count > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {count}
                    </span>
                    <label className="relative inline-block w-8 align-middle select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                      <div className="absolute left-0 top-[-2px] bg-white w-5 h-5 rounded-full border border-gray-300 shadow-sm transition-transform peer-checked:translate-x-3 peer-checked:border-primary"></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rules.length === 0 && (
        <div className="px-5 py-6 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">
            playlist_add
          </span>
          <p className="text-xs text-paragraph">
            No rules yet. Open the dashboard to create your first mock rule.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 border-t border-border-light bg-white mt-auto">
        <button
          onClick={openDashboard}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary hover:opacity-90 text-white font-bold text-sm transition-all shadow-md shadow-primary/20"
        >
          <span>Open Dashboard</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
        </button>
        <div className="flex justify-between mt-3 px-1">
          <div className="flex items-center gap-1.5 text-xs text-paragraph">
            {effectiveActive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Active &middot; {activeCount} rule{activeCount !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                Inactive
              </>
            )}
          </div>
          <div className="text-xs text-paragraph">
            v0.1.0
          </div>
        </div>
      </footer>
    </div>
  );
};
