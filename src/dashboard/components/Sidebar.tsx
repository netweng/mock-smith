import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RoutePath } from '../../shared/types';
import { useRules, useEnabled } from '../hooks/useStorage';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { rules } = useRules();
  const { enabled, toggle } = useEnabled();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 border-r border-border-light bg-white flex flex-col shrink-0 h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md shadow-primary/20">
          <span className="material-symbols-outlined text-xl">
            architecture
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-headline font-display">
          MockSmith
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Main
        </div>

        <button
          onClick={() => navigate(RoutePath.DASHBOARD)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors ${isActive(RoutePath.DASHBOARD) ? 'bg-primary/10 text-primary' : 'text-paragraph hover:bg-slate-50'}`}
        >
          <span
            className={`material-symbols-outlined text-xl ${isActive(RoutePath.DASHBOARD) ? 'filled-icon' : ''}`}
          >
            list
          </span>
          <span>All Rules</span>
          <span className="ml-auto text-[10px] font-bold bg-slate-100 text-paragraph px-2 py-0.5 rounded-full">
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => navigate(RoutePath.LOGS)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors ${isActive(RoutePath.LOGS) ? 'bg-primary/10 text-primary' : 'text-paragraph hover:bg-slate-50'}`}
        >
          <span
            className={`material-symbols-outlined text-xl ${isActive(RoutePath.LOGS) ? 'filled-icon' : ''}`}
          >
            history
          </span>
          <span>Traffic Logs</span>
        </button>

        <div className="mt-8">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Labels
            </span>
            <span className="text-[9px] font-bold text-paragraph/40 bg-slate-100 px-1.5 py-0.5 rounded">
              WIP
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-1.5 text-sm text-paragraph/50 rounded-lg">
              <span className="size-2 rounded-full bg-emerald-300"></span>
              <span>Production</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-1.5 text-sm text-paragraph/50 rounded-lg">
              <span className="size-2 rounded-full bg-amber-300"></span>
              <span>Staging</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border-light space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-headline">
            {enabled ? 'Interception ON' : 'Interception OFF'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={toggle}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </aside>
  );
};
