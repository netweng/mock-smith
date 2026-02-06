import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRules, useEnabled } from '../hooks/useStorage';
import { MethodBadge } from '../components/MethodBadge';
import { storage } from '../../shared/storage';
import { generateId, RuleAction } from '../../shared/types';

const ACTION_BADGE_STYLES: Record<RuleAction, string> = {
  mock: 'bg-primary/10 text-primary',
  rewrite: 'bg-amber-100 text-amber-700',
  passthrough: 'bg-slate-100 text-slate-500',
};

export const RulesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { rules, loading } = useRules();
  const { enabled, toggle } = useEnabled();
  const [searchTerm, setSearchTerm] = useState('');

  const activeCount = rules.filter((r) => r.enabled).length;

  const filteredRules = rules.filter((rule) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      rule.name.toLowerCase().includes(q) ||
      rule.match.url.toLowerCase().includes(q) ||
      (rule.match.method || '').toLowerCase().includes(q) ||
      rule.type.toLowerCase().includes(q)
    );
  });

  const handleToggle = async (id: string) => {
    await storage.toggleRule(id);
  };

  const handleDelete = async (id: string) => {
    await storage.deleteRule(id);
  };

  const handleDuplicate = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    await storage.addRule({
      ...rule,
      id: generateId(),
      name: `${rule.name} (copy)`,
      enabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const getMethodDisplay = (rule: (typeof rules)[0]) => {
    if (rule.type === 'graphql') return 'GQL';
    return rule.match.method || 'ANY';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border-light flex items-center justify-between px-8 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-headline">Rules Dashboard</h2>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Active rules:
            </span>
            <span className="text-xs font-bold text-primary">
              {activeCount} / {rules.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-100">
            <span className="text-sm font-semibold text-headline">
              {enabled ? 'Interception Enabled' : 'Interception Disabled'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={toggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="space-y-4 shrink-0 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-border-light rounded-xl pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-shadow outline-none text-headline placeholder:text-paragraph/60"
                placeholder="Search by rule name, URL pattern, or method..."
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/edit')}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                New Rule
              </button>
            </div>
          </div>
        </div>

        {/* Rules table */}
        <div className="flex-1 bg-white rounded-2xl border border-border-light flex flex-col shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-paragraph">
              Loading rules...
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-paragraph gap-3 p-12">
              <span className="material-symbols-outlined text-5xl text-slate-300">
                playlist_add
              </span>
              {rules.length === 0 ? (
                <>
                  <p className="text-sm font-medium text-headline">
                    No rules yet
                  </p>
                  <p className="text-xs text-paragraph text-center max-w-xs">
                    Create your first mock rule to start intercepting API
                    requests.
                  </p>
                  <button
                    onClick={() => navigate('/edit')}
                    className="mt-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-all"
                  >
                    Create First Rule
                  </button>
                </>
              ) : (
                <p className="text-sm">
                  No rules match &ldquo;{searchTerm}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr className="border-b border-slate-50">
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16 text-center">
                      Active
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">
                      Method
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Rule Name
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Pattern
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">
                      Type
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28">
                      Action
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-32 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggle(rule.id)}
                          className="size-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <MethodBadge method={getMethodDisplay(rule)} />
                      </td>
                      <td className="py-4 px-6">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/edit/${rule.id}`)}
                        >
                          <span className="font-semibold text-headline">
                            {rule.name}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-[11px] text-paragraph/60 mt-0.5 truncate max-w-xs">
                            {rule.description}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-xs text-paragraph bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-mono">
                          {rule.match.url}
                        </code>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[10px] font-bold uppercase text-paragraph/70">
                          {rule.type}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ACTION_BADGE_STYLES[rule.action] || ACTION_BADGE_STYLES.mock}`}
                        >
                          {rule.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/edit/${rule.id}`)}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-lg">
                              edit
                            </span>
                          </button>
                          <button
                            onClick={() => handleDuplicate(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <span className="material-symbols-outlined text-lg">
                              content_copy
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-lg">
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredRules.length > 0 && (
            <div className="border-t border-slate-50 px-6 py-4 flex items-center justify-between bg-white rounded-b-2xl shrink-0">
              <p className="text-xs text-paragraph">
                Showing{' '}
                <span className="font-bold text-headline">
                  {filteredRules.length}
                </span>{' '}
                of{' '}
                <span className="font-bold text-headline">{rules.length}</span>{' '}
                rules
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
