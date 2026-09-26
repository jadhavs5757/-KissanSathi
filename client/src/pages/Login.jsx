import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, LogIn, Lock, Mail, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname || '/dashboard';
  const infoMessage = location.state?.message || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setEmail('demo.farmer@kisansaarthi.in');
    setPassword('KisanDemo@2026');
    setError('');
    setLoading(true);
    try {
      // First try login; if demo user doesn't exist, auto-register via Supabase Auth
      try {
        await login('demo.farmer@kisansaarthi.in', 'KisanDemo@2026');
      } catch (loginErr) {
        await register({
          name: 'Ramesh Patel',
          email: 'demo.farmer@kisansaarthi.in',
          password: 'KisanDemo@2026',
          phone: '9876543210',
          location: 'Nashik, Maharashtra',
          preferred_language: 'en'
        });
        await login('demo.farmer@kisansaarthi.in', 'KisanDemo@2026');
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Could not initialize demo login: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a110c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-forest-600 flex items-center justify-center shadow-xl shadow-forest-900/40 border border-forest-400/40">
              <Sprout className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h2 className="text-2xl font-bold font-display text-white mt-4 tracking-tight">
            Welcome back to KisanSaarthi
          </h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to your farmer dashboard and active crop cycles</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden">
          {infoMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
              {infoMessage}
            </div>
          )}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="farmer@example.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" isLoading={loading} className="w-full mt-2" size="lg" icon={LogIn}>
              Sign In
            </Button>
          </form>

          {/* Quick Demo Login Option for Judges & Evaluators */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>One-Click Judge Demo Login (Ramesh Patel)</span>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
