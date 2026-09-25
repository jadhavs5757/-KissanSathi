import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Sprout, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a110c] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-forest-900/60 border border-forest-500/30 flex items-center justify-center text-forest-400 mb-6">
        <Sprout className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white font-display">404</h1>
      <h2 className="text-lg font-semibold text-slate-200 mt-2 font-display">Field Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
        The farm parcel or page you requested does not exist or has been relocated.
      </p>
      <Link to="/dashboard">
        <Button icon={ArrowLeft} size="sm">
          Return to Command Center
        </Button>
      </Link>
    </div>
  );
}
