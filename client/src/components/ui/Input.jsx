import React from 'react';

export default function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helper,
  required = false,
  disabled = false,
  className = '',
  icon: Icon,
  min,
  max,
  step,
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-medium text-slate-300">
          {label} {required && <span className="text-emerald-400">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id || name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`w-full bg-slate-900/80 border rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500/50 ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-slate-800 focus:border-forest-500/70 hover:border-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {helper && !error && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}
