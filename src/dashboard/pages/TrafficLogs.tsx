import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutePath, RuleAction, TrafficLogEntry } from '../../shared/types';
import { MethodBadge } from '../components/MethodBadge';
import { useLogs } from '../hooks/useLogs';

type ActionDisplay = 'MOCKED' | 'REDIRECT' | 'PASSTHROUGH';

function actionToDisplay(action: RuleAction): ActionDisplay {
  switch (action) {
    case 'mock': return 'MOCKED';
    case 'rewrite': return 'REDIRECT';
    case 'passthrough': return 'PASSTHROUGH';
  }
}

const ACTION_DISPLAY_STYLES: Record<ActionDisplay, string> = {
  MOCKED: 'bg-primary text-white shadow-blue-200',
  REDIRECT: 'bg-secondary/20 text-secondary shadow-none',
  PASSTHROUGH: 'bg-gray-100 text-gray-400 shadow-none',
};

const ACTION_FILTER_STYLES: Record<ActionDisplay, { active: string; inactive: string }> = {
  MOCKED: {
    active: 'bg-primary/10 text-primary border-primary/30',
    inactive: 'bg-white text-primary border-primary/20 hover:bg-primary/5',
  },
  REDIRECT: {
    active: 'bg-secondary/10 text-headline border-secondary/30',
    inactive: 'bg-white text-secondary border-secondary/30 hover:bg-secondary/10 hover:text-headline',
  },
  PASSTHROUGH: {
    active: 'bg-gray-100 text-headline border-gray-300',
    inactive: 'bg-white text-paragraph border-gray-200 hover:bg-gray-50',
  },
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function statusColor(status?: number): string {
  if (!status) return 'text-gray-400';
  if (status < 300) return 'text-green-600';
  if (status < 400) return 'text-yellow-600';
  return 'text-red-600';
}

export const TrafficLogs: React.FC = () => {
  const navigate = useNavigate();
  const { logs, loading, refresh, clear } = useLogs();
  const [selectedLog, setSelectedLog] = useState<TrafficLogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'Details' | 'Headers' | 'Rule'>('Details');
  const [activeFilters, setActiveFilters] = useState<Set<ActionDisplay>>(new Set());

  const toggleFilter = (filter: ActionDisplay) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  const filteredLogs = activeFilters.size === 0
    ? logs
    : logs.filter((log) => activeFilters.has(actionToDisplay(log.action)));

  const mockedCount = logs.filter((l) => l.action === 'mock').length;
  const redirectCount = logs.filter((l) => l.action === 'rewrite').length;
  const passthroughCount = logs.filter((l) => l.action === 'passthrough').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white px-6 py-3 border-b border-border-light shrink-0 h-14">
        <button
          onClick={() => navigate(RoutePath.DASHBOARD)}
          className="flex items-center gap-2 text-sm text-paragraph hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Rules
        </button>
        <div className="h-4 w-px bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-headline">Traffic Logs</h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-paragraph hover:text-primary border border-slate-200 rounded-lg hover:border-primary/30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
          <button
            onClick={clear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-tertiary hover:bg-tertiary/5 border border-slate-200 rounded-lg hover:border-tertiary/30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
            Clear
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white px-6 py-2.5 border-b border-border-light flex flex-wrap items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-paragraph uppercase tracking-widest mr-1">Filter:</span>
        <button
          onClick={() => toggleFilter('MOCKED')}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
            activeFilters.has('MOCKED') ? ACTION_FILTER_STYLES.MOCKED.active : ACTION_FILTER_STYLES.MOCKED.inactive
          }`}
        >
          Mocked <span className="bg-primary text-white px-1.5 rounded-full text-[10px]">{mockedCount}</span>
        </button>
        <button
          onClick={() => toggleFilter('REDIRECT')}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
            activeFilters.has('REDIRECT') ? ACTION_FILTER_STYLES.REDIRECT.active : ACTION_FILTER_STYLES.REDIRECT.inactive
          }`}
        >
          Redirected <span className="bg-secondary text-white px-1.5 rounded-full text-[10px]">{redirectCount}</span>
        </button>
        <button
          onClick={() => toggleFilter('PASSTHROUGH')}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
            activeFilters.has('PASSTHROUGH') ? ACTION_FILTER_STYLES.PASSTHROUGH.active : ACTION_FILTER_STYLES.PASSTHROUGH.inactive
          }`}
        >
          Passthrough <span className="bg-gray-200 text-gray-500 px-1.5 rounded-full text-[10px]">{passthroughCount}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-paragraph">
            Loading logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
            <div className="size-20 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-400">inbox</span>
            </div>
            <h3 className="text-xl font-bold text-headline font-display">No Intercepted Requests</h3>
            <p className="text-sm text-paragraph text-center max-w-md">
              Traffic logs will appear here when MockSmith intercepts requests matching your rules.
              Make sure interception is enabled and rules are active.
            </p>
            <button
              onClick={() => navigate(RoutePath.DASHBOARD)}
              className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20"
            >
              Go to Rules Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Table Section */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-border-light">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50/80 backdrop-blur border-b border-secondary/30 text-headline">
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest w-28">Time</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest w-20">Method</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest">URL</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest w-16 text-center">Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest w-24 text-center">Type</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest w-32 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log) => {
                      const displayType = actionToDisplay(log.action);
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`cursor-pointer transition-colors border-l-4 ${
                            selectedLog?.id === log.id
                              ? 'bg-primary/5 border-primary'
                              : 'hover:bg-gray-50 border-transparent'
                          }`}
                        >
                          <td className="px-4 py-3 text-xs font-mono text-paragraph/70">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="px-4 py-3">
                            <MethodBadge method={log.method} />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium truncate text-headline w-full max-w-[200px] xl:max-w-md">
                              {log.url}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-mono text-xs font-bold ${statusColor(log.responseStatus)}`}>
                              {log.responseStatus ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm ${ACTION_DISPLAY_STYLES[displayType]}`}>
                              {displayType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/edit/${log.ruleId}`);
                              }}
                              className="inline-flex items-center justify-center gap-1 bg-white border border-primary text-primary hover:bg-primary hover:text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 flex items-center justify-between text-xs font-medium text-paragraph shrink-0">
                <div className="flex items-center gap-4">
                  <span>Total: <b className="text-headline">{filteredLogs.length}</b></span>
                  <span className="hidden sm:inline">Mocked: <b className="text-primary">{mockedCount}</b></span>
                </div>
                <span className="text-secondary uppercase font-mono text-[10px]">max 500, in-memory</span>
              </div>
            </div>

            {/* Details Panel */}
            <div className="w-full lg:w-[400px] xl:w-[460px] shrink-0 bg-white flex flex-col overflow-hidden h-full">
              {selectedLog ? (
                <>
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm ${ACTION_DISPLAY_STYLES[actionToDisplay(selectedLog.action)]}`}>
                          {actionToDisplay(selectedLog.action)}
                        </span>
                        <MethodBadge method={selectedLog.method} />
                      </div>
                      <span className="text-xs text-paragraph font-mono">{formatTime(selectedLog.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg">link</span>
                      <h3 className="font-mono text-sm text-headline truncate font-medium" title={selectedLog.url}>
                        {selectedLog.url}
                      </h3>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center border-b border-gray-200 bg-white">
                    {(['Details', 'Headers', 'Rule'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                          activeTab === tab
                            ? 'text-primary border-b-2 border-primary bg-blue-50/20'
                            : 'text-paragraph hover:text-headline hover:bg-gray-50 font-medium'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-0 bg-white">
                    {activeTab === 'Details' && (
                      <div className="divide-y divide-gray-50">
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">URL</p>
                          <p className="font-mono text-xs text-headline break-all">{selectedLog.url}</p>
                        </div>
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">Method</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.method}</p>
                        </div>
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">Response Status</p>
                          <p className={`font-mono text-xs font-bold ${statusColor(selectedLog.responseStatus)}`}>
                            {selectedLog.responseStatus ?? '—'}
                          </p>
                        </div>
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">Action</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.action}</p>
                        </div>
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">Timestamp</p>
                          <p className="font-mono text-xs text-headline">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {activeTab === 'Headers' && (
                      <div className="divide-y divide-gray-50">
                        {selectedLog.requestHeaders && Object.keys(selectedLog.requestHeaders).length > 0 ? (
                          Object.entries(selectedLog.requestHeaders).map(([key, value]) => (
                            <div key={key} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                              <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">{key}</p>
                              <p className="font-mono text-xs text-headline break-all">{value}</p>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-paragraph">
                            No request headers captured
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === 'Rule' && (
                      <div className="divide-y divide-gray-50">
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">Rule Name</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.ruleName || '-'}</p>
                        </div>
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <p className="text-[10px] uppercase font-bold text-secondary mb-0.5 tracking-wide">Rule ID</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.ruleId}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto">
                    <button
                      onClick={() => navigate(`/edit/${selectedLog.ruleId}`)}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:opacity-90 transition-colors shadow-md shadow-blue-200"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      <span className="text-sm font-bold">Edit Matched Rule</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-paragraph p-8">
                  <span className="material-symbols-outlined text-4xl text-slate-300">touch_app</span>
                  <p className="text-sm text-center">Select a log entry to view details</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
