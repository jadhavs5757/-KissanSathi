import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  icon: Icon,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-gradient-to-r from-forest-600 to-forest-500 hover:from-forest-500 hover:to-forest-400 text-white shadow-lg shadow-forest-900/30 border border-forest-400/30 focus:ring-forest-500',
    secondary: 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-500/20 hover:border-emerald-500/40 focus:ring-emerald-500',
    outline: 'bg-transparent hover:bg-white/5 text-slate-200 border border-slate-700 hover:border-slate-500 focus:ring-slate-500',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-950/30 border border-amber-400/30 focus:ring-amber-500',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 text-white shadow-lg shadow-red-950/30 border border-red-500/30 focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white focus:ring-slate-500'
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
}
