import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RuleAction, TrafficLogEntry } from '../../shared/types';
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
  MOCKED: 'bg-primary/10 text-primary',
  REDIRECT: 'bg-amber-100 text-amber-700',
  PASSTHROUGH: 'bg-slate-100 text-slate-500',
};

const ACTION_FILTER_STYLES: Record<ActionDisplay, { active: string; inactive: string }> = {
  MOCKED: {
    active: 'bg-primary/10 text-primary border-primary/30',
    inactive: 'bg-white text-primary border-primary/20 hover:bg-primary/5',
  },
  REDIRECT: {
    active: 'bg-amber-50 text-amber-700 border-amber-300',
    inactive: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
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

function formatOpName(op?: string | string[]): string {
  if (!op) return '';
  if (Array.isArray(op)) return op.join(', ');
  return op;
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
      <header className="h-16 border-b border-border-light flex items-center justify-between px-8 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-headline">Traffic Logs</h2>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Filter:</span>
          <button
            onClick={() => toggleFilter('MOCKED')}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
              activeFilters.has('MOCKED') ? ACTION_FILTER_STYLES.MOCKED.active : ACTION_FILTER_STYLES.MOCKED.inactive
            }`}
          >
            Mocked <span className="bg-primary/20 text-primary px-1.5 rounded-full text-[10px]">{mockedCount}</span>
          </button>
          <button
            onClick={() => toggleFilter('REDIRECT')}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
              activeFilters.has('REDIRECT') ? ACTION_FILTER_STYLES.REDIRECT.active : ACTION_FILTER_STYLES.REDIRECT.inactive
            }`}
          >
            Redirected <span className="bg-amber-100 text-amber-700 px-1.5 rounded-full text-[10px]">{redirectCount}</span>
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

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-paragraph">
            Loading logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex-1 bg-white rounded-2xl border border-border-light flex flex-col items-center justify-center gap-4 p-12 shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-300">inbox</span>
            <p className="text-sm font-medium text-headline">No Intercepted Requests</p>
            <p className="text-xs text-paragraph text-center max-w-xs">
              Traffic logs will appear here when MockSmith intercepts requests matching your rules.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-row gap-6 overflow-hidden">
            {/* Table Card */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-border-light flex flex-col shadow-sm overflow-hidden transition-all duration-300">
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b border-slate-50">
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Time</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Method</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-36">Rule Name</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28">Req Type</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16 text-center">Status</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28">Action</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLogs.map((log) => {
                      const displayType = actionToDisplay(log.action);
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50/50 group ${
                            selectedLog?.id === log.id ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-4 px-6 text-xs font-mono text-paragraph">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="py-4 px-6">
                            <MethodBadge method={log.method} />
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-medium truncate text-headline max-w-[180px] xl:max-w-sm">
                              {log.url}
                            </p>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs font-medium text-paragraph truncate block max-w-[120px]" title={log.ruleName || ''}>
                              {log.ruleName || '—'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {log.requestType === 'graphql' ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-primary uppercase">GQL</span>
                                {log.operationName && (
                                  <span className="text-[10px] text-paragraph truncate max-w-[100px]" title={formatOpName(log.operationName)}>
                                    {formatOpName(log.operationName)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-paragraph/70 uppercase">REST</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`font-mono text-xs font-bold ${statusColor(log.responseStatus)}`}>
                              {log.responseStatus ?? '—'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ACTION_DISPLAY_STYLES[displayType]}`}>
                              {displayType}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/edit/${log.ruleId}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit rule"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="border-t border-slate-50 px-6 py-4 flex items-center justify-between bg-white rounded-b-2xl shrink-0">
                <p className="text-xs text-paragraph">
                  Showing <span className="font-bold text-headline">{filteredLogs.length}</span> of <span className="font-bold text-headline">{logs.length}</span> logs
                </p>
                <span className="text-[10px] text-paragraph font-mono uppercase">max 500, in-memory</span>
              </div>
            </div>

            {/* Details Panel — slides in/out */}
            <div
              className={`shrink-0 bg-white rounded-2xl border border-border-light flex flex-col shadow-sm overflow-hidden h-full transition-all duration-300 ease-in-out ${
                selectedLog
                  ? 'w-[400px] xl:w-[460px] opacity-100 translate-x-0'
                  : 'w-0 opacity-0 translate-x-4 border-0 p-0'
              }`}
            >
              {selectedLog && (
                <>
                  <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ACTION_DISPLAY_STYLES[actionToDisplay(selectedLog.action)]}`}>
                          {actionToDisplay(selectedLog.action)}
                        </span>
                        <MethodBadge method={selectedLog.method} />
                      </div>
                      <button
                        onClick={() => setSelectedLog(null)}
                        className="p-1 text-slate-400 hover:text-headline hover:bg-slate-100 rounded-lg transition-colors"
                        title="Close panel"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm text-headline truncate flex-1 mr-2" title={selectedLog.url}>
                        {selectedLog.url}
                      </p>
                      <span className="text-xs text-paragraph font-mono shrink-0">{formatTime(selectedLog.timestamp)}</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center border-b border-slate-100">
                    {(['Details', 'Headers', 'Rule'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                          activeTab === tab
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-paragraph hover:text-headline hover:bg-slate-50 font-medium'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {activeTab === 'Details' && (
                      <div className="divide-y divide-slate-50">
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">URL</p>
                          <p className="font-mono text-xs text-headline break-all">{selectedLog.url}</p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Method</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.method}</p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Request Type</p>
                          <p className="font-mono text-xs text-headline uppercase">{selectedLog.requestType || 'rest'}</p>
                        </div>
                        {selectedLog.operationName && (
                          <div className="px-4 py-3">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Operation Name</p>
                            <p className="font-mono text-xs text-primary">{formatOpName(selectedLog.operationName)}</p>
                          </div>
                        )}
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Response Status</p>
                          <p className={`font-mono text-xs font-bold ${statusColor(selectedLog.responseStatus)}`}>
                            {selectedLog.responseStatus ?? '—'}
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Action</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.action}</p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Timestamp</p>
                          <p className="font-mono text-xs text-headline">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                        </div>
                        {selectedLog.responseBody && (
                          <div className="px-4 py-3">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wide">Response Body</p>
                            <pre className="font-mono text-xs text-headline bg-slate-50 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all border border-slate-100">
                              {selectedLog.responseBody}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === 'Headers' && (
                      <div className="divide-y divide-slate-50">
                        {selectedLog.requestHeaders && Object.keys(selectedLog.requestHeaders).length > 0 ? (
                          Object.entries(selectedLog.requestHeaders).map(([key, value]) => (
                            <div key={key} className="px-4 py-3">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">{key}</p>
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
                      <div className="divide-y divide-slate-50">
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Rule Name</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.ruleName || '-'}</p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wide">Rule ID</p>
                          <p className="font-mono text-xs text-headline">{selectedLog.ruleId}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-50 mt-auto">
                    <button
                      onClick={() => navigate(`/edit/${selectedLog.ruleId}`)}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:opacity-90 transition-colors shadow-md shadow-primary/20 text-sm font-bold"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Edit Matched Rule
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
