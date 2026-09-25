import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
  const variants = {
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-500/30',
    info: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30',
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/50'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide select-none ${
        variants[variant] || variants.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}
