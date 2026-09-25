import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing agricultural data.',
  onRetry,
  className = ''
}) {
  return (
    <div className={`p-6 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-center max-w-lg mx-auto ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-rose-900/40 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-200 font-display">{title}</h3>
      <p className="text-xs text-rose-300/80 mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" icon={RefreshCw}>
          Try Again
        </Button>
      )}
    </div>
  );
}
