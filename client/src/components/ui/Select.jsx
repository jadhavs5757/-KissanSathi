import React from 'react';

export default function Select({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  error,
  helper,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-medium text-slate-300">
          {label} {required && <span className="text-emerald-400">*</span>}
        </label>
      )}
      <select
        id={id || name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-slate-900/90 border rounded-xl px-3.5 py-2.5 text-sm text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500/50 ${
          error
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-slate-800 focus:border-forest-500/70 hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {helper && !error && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}
