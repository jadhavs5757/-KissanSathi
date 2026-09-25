import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = ''
}) {
  return (
    <div className={`text-center py-12 px-6 rounded-2xl glass-panel border-dashed border-slate-800 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-200 font-display">{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5">{description}</p>}
      {actionText && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} size="sm">
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
