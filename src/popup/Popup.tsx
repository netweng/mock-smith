import React, { useState, useEffect, useCallback } from 'react';
import { Rule } from '../shared/types';
import { storage } from '../shared/storage';

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
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [r, e] = await Promise.all([
      storage.getRules(),
      storage.getEnabled(),
    ]);
    setRules(r);
    setEnabled(e);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return storage.onChanged(refresh);
  }, [refresh]);

  const handleToggleGlobal = async () => {
    await storage.setEnabled(!enabled);
  };

  const handleToggleRule = async (id: string) => {
    await storage.toggleRule(id);
  };

  const openDashboard = () => {
    chrome.runtime.openOptionsPage();
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const enabledRules = rules.filter((r) => r.enabled);

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
        </div>

        {/* Master Switch Card */}
        <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-secondary/30 shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined ${enabled ? 'text-primary' : 'text-gray-400'}`} style={{ fontSize: '20px' }}>
              power_settings_new
            </span>
            <span className="text-headline text-sm font-bold">Master Switch</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggleGlobal}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-colors"></div>
            <div className="absolute left-0 top-0 bg-white w-5 h-5 rounded-full border border-gray-300 shadow-sm transition-transform peer-checked:translate-x-full peer-checked:border-primary"></div>
          </label>
        </div>
      </header>

      {/* Active Rules List */}
      {enabledRules.length > 0 && (
        <div className={`px-3 py-2 max-h-[240px] overflow-y-auto transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="text-xs font-bold text-secondary uppercase tracking-wider px-2 mb-2">Active Rules</h3>
          <div className="flex flex-col gap-2">
            {enabledRules.slice(0, 8).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-lg border border-secondary/20 bg-white hover:border-primary/30 hover:bg-primary/5 transition-colors shadow-sm"
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
                <label className="relative inline-block w-8 align-middle select-none flex-shrink-0 cursor-pointer">
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
            ))}
          </div>
          {enabledRules.length > 8 && (
            <div className="text-[10px] text-paragraph text-center py-1">
              +{enabledRules.length - 8} more
            </div>
          )}
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

      {enabledRules.length === 0 && rules.length > 0 && (
        <div className="px-5 py-6 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">
            toggle_off
          </span>
          <p className="text-xs text-paragraph">
            No active rules. Enable some rules to start intercepting requests.
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
            {enabled ? (
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
