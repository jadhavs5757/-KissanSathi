import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sprout,
  TrendingUp,
  CloudRain,
  ShieldCheck,
  Landmark,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  BarChart3
} from 'lucide-react';
import Button from '../components/ui/Button';

export default function Landing() {
  const steps = [
    { title: 'PLAN', desc: 'Profile land, soil, water & budget' },
    { title: 'DECIDE', desc: 'AI crop suitability & scenarios' },
    { title: 'PLANT', desc: 'Optimal seed spacing & basal dose' },
    { title: 'MONITOR', desc: 'Growth stage progress tracking' },
    { title: 'PROTECT', desc: 'Weather-aware actions & risk alerts' },
    { title: 'HARVEST', desc: 'Maturity cues & dry harvest timing' },
    { title: 'SELL', desc: 'Mandi realization & expense audits' },
    { title: 'ANALYSE', desc: 'Farm history & future yield planning' }
  ];

  return (
    <div className="min-h-screen bg-[#0a110c] text-slate-100 flex flex-col selection:bg-forest-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-600 flex items-center justify-center shadow-lg shadow-forest-900/40 border border-forest-400/40">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold font-display text-white tracking-tight leading-tight block">
              KisanSaarthi <span className="text-emerald-400">AI</span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-wide font-medium">Know What to Grow. Know What to Do Next.</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 max-w-5xl mx-auto text-center flex-1 flex flex-col justify-center items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6 shadow-sm"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Agricultural Decision Intelligence for Indian Farmers</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold font-display tracking-tight text-white max-w-4xl leading-[1.15]"
        >
          Know What to Grow.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-forest-300 to-amber-300">
            Know What to Do Next.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed"
        >
          Transform your land, soil health card, water availability, and budget into explainable crop options, deterministic profit scenarios, and weather-aware daily farm guidance.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/register">
            <Button size="lg" icon={ArrowRight}>
              Create Farm Profile
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Explore Demo Farm
            </Button>
          </Link>
        </motion.div>

        {/* 8-Stage Lifecycle Visualization */}
        <div className="w-full mt-20 pt-10 border-t border-slate-900">
          <p className="text-xs uppercase tracking-widest text-emerald-400/80 font-bold mb-6">
            The Complete Farm Lifecycle
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-left">
            {steps.map((st, i) => (
              <div
                key={st.title}
                className="glass-panel p-3 rounded-xl border border-emerald-950/80 hover:border-emerald-500/40 transition-colors"
              >
                <span className="text-[10px] font-mono text-emerald-500 font-bold block mb-1">
                  0{i + 1}
                </span>
                <h4 className="text-xs font-bold text-slate-100 font-display">{st.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="bg-slate-950/60 border-t border-slate-900 py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/15">
            <div className="w-12 h-12 rounded-xl bg-forest-900/60 border border-forest-500/30 text-emerald-400 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 font-display">AI Crop Recommendations</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Gemini reasoning analyzes your farm's soil NPK, pH, water capacity, and working capital to provide multiple transparent crop alternatives with risks and tradeoffs.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/15">
            <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 font-display">Deterministic Business Plans</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              No hallucinatory math. Backend algorithms compute exact Conservative, Expected, and Favorable net return scenarios with full input cost breakdowns.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/15">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4">
              <CloudRain className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 font-display">Weather-Aware Farm Actions</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Weather forecasts translated directly into field-level decisions: holding irrigation during predicted rainfall, clearing furrows, and preventing root rot.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>© 2026 KisanSaarthi AI. Built with precision for sustainable, profitable farming.</p>
      </footer>
    </div>
  );
}
