import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cropService } from '../services/cropService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import {
  TrendingUp,
  BarChart3,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RotateCw,
  ArrowLeft
} from 'lucide-react';

export default function BusinessPlanReview() {
  const { farmId, planId } = useParams();
  const navigate = useNavigate();
  const [businessPlan, setBusinessPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPlan() {
      setLoading(true);
      try {
        const data = await cropService.getBusinessPlan(farmId, planId);
        setBusinessPlan(data);
      } catch (err) {
        setError(err.message || 'Could not load business plan');
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [farmId, planId]);

  if (loading) {
    return <LoadingScreen message="Computing deterministic farm economics..." />;
  }

  if (error || !businessPlan) {
    return <ErrorState message={error} onRetry={() => navigate(`/farms/${farmId}/crops`)} />;
  }

  const breakdown = typeof businessPlan.cost_breakdown === 'string'
    ? JSON.parse(businessPlan.cost_breakdown)
    : businessPlan.cost_breakdown || {};

  const assumptions = Array.isArray(businessPlan.assumptions)
    ? businessPlan.assumptions
    : typeof businessPlan.assumptions === 'string'
    ? JSON.parse(businessPlan.assumptions)
    : [];

  const scenarios = [
    {
      name: 'Conservative Scenario',
      tag: 'Adverse Weather / Lower Prices',
      badgeVariant: 'warning',
      cost: Number(businessPlan.conservative_cost),
      revenue: Number(businessPlan.conservative_revenue),
      net: Number(businessPlan.conservative_net),
      desc: 'Models a 15% rise in input costs and 20% lower market realization due to glut.'
    },
    {
      name: 'Expected Scenario',
      tag: 'Baseline Realistic Outcome',
      badgeVariant: 'success',
      cost: Number(businessPlan.expected_cost),
      revenue: Number(businessPlan.expected_revenue),
      net: Number(businessPlan.expected_net),
      desc: 'Standard seasonal modal price at APMC mandi with balanced fertilizer application.'
    },
    {
      name: 'Favorable Scenario',
      tag: 'Optimal Climate & Peak Demand',
      badgeVariant: 'info',
      cost: Number(businessPlan.favorable_cost),
      revenue: Number(businessPlan.favorable_revenue),
      net: Number(businessPlan.favorable_net),
      desc: 'Bumper harvest with strong festive/export market demand and cost efficiencies.'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <Link
            to={`/farms/${farmId}/crops`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Crop Options</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-white">
              Business Economics: {businessPlan.crop_name}
            </h1>
            <Badge variant="success">{businessPlan.land_area_acres} Acres</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculated deterministically: Net Return = Gross Revenue − Production Costs ({businessPlan.duration_days} Days)
          </p>
        </div>

        <Link to={`/farms/${farmId}/crop-cycles`}>
          <Button size="sm" icon={RotateCw}>
            Start Crop Cycle
          </Button>
        </Link>
      </div>

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((sc) => (
          <Card
            key={sc.name}
            className={`border ${
              sc.badgeVariant === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-white font-display">{sc.name}</h3>
              <Badge variant={sc.badgeVariant}>{sc.name.split(' ')[0]}</Badge>
            </div>
            <p className="text-[11px] text-slate-400 min-h-[32px]">{sc.desc}</p>

            <div className="my-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Production Cost:</span>
                <span className="font-semibold text-slate-200">₹{sc.cost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Gross Revenue:</span>
                <span className="font-semibold text-slate-200">₹{sc.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="font-bold text-slate-300">Estimated Net:</span>
                <span
                  className={`text-base font-extrabold font-display ${
                    sc.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ₹{sc.net.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic text-center">
              *Planning projection. Not a guaranteed outcome.
            </p>
          </Card>
        ))}
      </div>

      {/* Itemized Cost Breakdown Table */}
      <Card>
        <CardHeader
          title="Itemized Production Cost Breakdown"
          subtitle="Estimated operational inputs per standard agricultural package of practices"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          {Object.entries(breakdown).map(([cat, amount]) => (
            <div key={cat} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block capitalize">
                {cat.replace(/([A-Z])/g, ' $1')}
              </span>
              <span className="text-sm font-bold text-slate-100 mt-1 block">
                ₹{Number(amount).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Assumptions & Methodology Box */}
      <Card className="p-6 bg-slate-900/40 border-slate-800 text-xs space-y-2">
        <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] font-display flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>Calculation Transparency & Audit Rules</span>
        </h4>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          {assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
