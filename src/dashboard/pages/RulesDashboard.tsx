import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRules } from '../hooks/useStorage';
import { MethodBadge } from '../components/MethodBadge';
import { storage } from '../../shared/storage';
import { generateId, Rule, RuleAction } from '../../shared/types';

const ACTION_BADGE_STYLES: Record<RuleAction, string> = {
  mock: 'bg-primary/10 text-primary',
  rewrite: 'bg-amber-100 text-amber-700',
  passthrough: 'bg-slate-100 text-slate-500',
};

export const RulesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { rules, loading } = useRules();
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleExport = () => {
    const data = JSON.stringify(rules, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mocksmith-rules-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const incoming: Rule[] = Array.isArray(parsed) ? parsed : [];
        if (incoming.length === 0) {
          setImportStatus('No valid rules found in file');
          return;
        }
        // Validate minimal shape
        const valid = incoming.every(
          (r) => r.match?.url && r.name && r.type && r.action && r.response,
        );
        if (!valid) {
          setImportStatus('Invalid rule format');
          return;
        }
        // Assign new IDs to avoid conflicts, merge into existing rules
        const existing = await storage.getRules();
        const existingUrls = new Set(existing.map((r) => `${r.name}|${r.match.url}`));
        let added = 0;
        for (const rule of incoming) {
          const key = `${rule.name}|${rule.match.url}`;
          if (existingUrls.has(key)) continue;
          existing.push({
            ...rule,
            id: generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          added++;
        }
        await storage.saveRules(existing);
        setImportStatus(`Imported ${added} rule${added !== 1 ? 's' : ''}${incoming.length - added > 0 ? `, ${incoming.length - added} skipped (duplicate)` : ''}`);
      } catch {
        setImportStatus('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    // Reset input so re-importing the same file works
    e.target.value = '';
  };

  // Drag-and-drop is only available when not searching (since filtered indices differ from storage indices)
  const isDndEnabled = !searchTerm;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set transparent drag image for cleaner look
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      await storage.reorderRules(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-paragraph border border-slate-200 rounded-xl hover:border-primary/30 hover:text-primary transition-colors"
                title="Import rules from JSON"
              >
                <span className="material-symbols-outlined text-lg">upload</span>
                Import
              </button>
              <button
                onClick={handleExport}
                disabled={rules.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-paragraph border border-slate-200 rounded-xl hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export rules as JSON"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Export
              </button>
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
                    {isDndEnabled && (
                      <th className="py-4 pl-4 pr-1 w-8"></th>
                    )}
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
                  {filteredRules.map((rule, index) => (
                    <tr
                      key={rule.id}
                      draggable={isDndEnabled}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-slate-50/50 transition-colors group ${
                        dragIndex === index ? 'opacity-40' : ''
                      } ${dragOverIndex === index && dragIndex !== index ? 'border-t-2 !border-t-primary' : ''}`}
                    >
                      {isDndEnabled && (
                        <td className="py-4 pl-4 pr-1 w-8 cursor-grab active:cursor-grabbing">
                          <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-400 text-lg">
                            drag_indicator
                          </span>
                        </td>
                      )}
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
              {isDndEnabled && (
                <p className="text-[10px] text-paragraph/50 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">drag_indicator</span>
                  Drag to reorder priority
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Import status toast */}
      {importStatus && (
        <div className="fixed bottom-6 right-6 bg-headline text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-3 z-50 animate-fade-in">
          <span>{importStatus}</span>
          <button onClick={() => setImportStatus(null)} className="text-white/60 hover:text-white">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}
    </div>
  );
};
