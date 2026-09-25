import React from 'react';
import { Sprout } from 'lucide-react';

export default function LoadingScreen({ message = 'Loading KisanSaarthi AI...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-forest-900/40 border border-forest-500/30 flex items-center justify-center animate-pulse shadow-lg shadow-forest-900/20">
          <Sprout className="w-8 h-8 text-forest-400 animate-bounce" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-forest-500/10 blur-xl"></div>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-300 tracking-wide font-display">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Analyzing agricultural data & soil parameters</p>
    </div>
  );
}
