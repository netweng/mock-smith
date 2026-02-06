import React from 'react';

interface Props {
  method: string;
}

export const MethodBadge: React.FC<Props> = ({ method }) => {
  const getStyles = (m: string) => {
    switch (m.toUpperCase()) {
      case 'GET': return 'bg-emerald-100 text-emerald-700';
      case 'POST': return 'bg-amber-100 text-amber-700';
      case 'DELETE': return 'bg-rose-100 text-rose-700';
      case 'PUT': return 'bg-indigo-100 text-indigo-700';
      case 'PATCH': return 'bg-violet-100 text-violet-700';
      case 'GQL': return 'bg-primary/20 text-primary';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStyles(method)}`}>
      {method}
    </span>
  );
};
