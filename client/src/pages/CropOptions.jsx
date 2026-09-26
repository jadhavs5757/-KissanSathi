import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { cropService } from '../services/cropService';
import { farmService } from '../services/farmService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Droplets,
  Scale,
  ArrowRight,
  ShieldCheck,
  RotateCw
} from 'lucide-react';

export default function CropOptions() {
  const { farmId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [farm, setFarm] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [missingInfo, setMissingInfo] = useState([]);
  const [assumptions, setAssumptions] = useState([]);

  // Business plan modal state
  const [selectedCropForPlan, setSelectedCropForPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Crop cycle start modal state
  const [selectedCropForCycle, setSelectedCropForCycle] = useState(null);
  const [cycleVariety, setCycleVariety] = useState('Standard Recommended');
  const [cyclePlantingDate, setCyclePlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [cycleLoading, setCycleLoading] = useState(false);

  const fetchFarmAndPlans = async () => {
    try {
      const farmData = await farmService.getFarm(farmId);
      setFarm(farmData);
      const existingPlans = await cropService.getCropPlans(farmId);
      setPlans(existingPlans);

      // If no plans exist yet or first query param is set, trigger AI analysis automatically
      if (existingPlans.length === 0 || searchParams.get('first') === 'true') {
        runAnalysis(farmData);
      }
    } catch (err) {
      setError(err.message || 'Failed to load crop recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmAndPlans();
  }, [farmId]);

  const runAnalysis = async (farmObj) => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await cropService.analyzeFarm(farmId, {
        lowerRisk: true,
        lowerWaterUse: farmObj?.water_source === 'RAINFED'
      });
      setMissingInfo(res.missingInformation || []);
      setAssumptions(res.generalAssumptions || []);
      // Refresh stored plans
      const updatedPlans = await cropService.getCropPlans(farmId);
      setPlans(updatedPlans);
    } catch (err) {
      setError(err.message || 'AI analysis could not complete');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateBusinessPlan = async (crop) => {
    setPlanLoading(true);
    try {
      const bp = await cropService.createBusinessPlan(farmId, {
        cropPlanId: crop.id,
        cropName: crop.crop_name,
        landAreaAcres: Number(farm.land_area_acres),
        durationDays: crop.duration_days
      });
      navigate(`/farms/${farmId}/business-plan/${bp.id}`);
    } catch (err) {
      alert(err.message || 'Failed to generate business plan');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleStartCycle = async (e) => {
    e.preventDefault();
    if (!selectedCropForCycle) return;
    setCycleLoading(true);
    try {
      const cycle = await cropService.createCropCycle(farmId, {
        cropPlanId: selectedCropForCycle.id,
        cropName: selectedCropForCycle.crop_name,
        variety: cycleVariety,
        areaAcres: Number(farm.land_area_acres),
        plantingDate: cyclePlantingDate,
        expectedDurationDays: selectedCropForCycle.duration_days,
        currentStage: 'PLANTING',
        status: 'ACTIVE'
      });
      setSelectedCropForCycle(null);
      navigate(`/farms/${farmId}/crop-cycles/${cycle.id}`);
    } catch (err) {
      alert(err.message || 'Failed to start crop cycle');
    } finally {
      setCycleLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading farm agro-climatic profile..." />;
  }

  if (error && plans.length === 0) {
    return <ErrorState message={error} onRetry={() => runAnalysis(farm)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">AI Crop Recommendations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Grounded in {farm?.name}'s soil chemistry, water capacity ({farm?.water_source}), and ₹{Number(farm?.capital_budget).toLocaleString('en-IN')} budget
          </p>
        </div>
        <Button
          onClick={() => runAnalysis(farm)}
          isLoading={analyzing}
          variant="secondary"
          size="sm"
          icon={RefreshCw}
        >
          Re-Analyze Farm
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Assumptions & Missing Info Banner */}
      {(missingInfo.length > 0 || assumptions.length > 0) && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold font-display">
            <Info className="w-4 h-4" />
            <span>AI Reasoning Parameters & Assumptions</span>
          </div>
          {missingInfo.length > 0 && (
            <div className="text-amber-300/90 pl-6">
              <span className="font-semibold">Missing context filled with conservative defaults:</span>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                {missingInfo.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {assumptions.length > 0 && (
            <p className="text-slate-400 pl-6 italic">
              Note: Projections are planning estimates based on regional modal APMC mandi prices and normal seasonal weather. Net profit is never guaranteed.
            </p>
          )}
        </div>
      )}

      {/* Crop Cards Grid */}
      {plans.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const tradeoffs = plan.tradeoffs ? plan.tradeoffs.split(';') : [];
            const planAssumptions = Array.isArray(plan.assumptions) ? plan.assumptions : [];

            return (
              <Card key={plan.id} hover className="flex flex-col justify-between border-emerald-500/20">
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-white font-display">{plan.crop_name}</h3>
                      <p className="text-xs text-emerald-400 mt-0.5 font-medium flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5" />
                        <span>{plan.water_requirement}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={plan.suitability === 'HIGH' ? 'success' : plan.suitability === 'MEDIUM' ? 'warning' : 'neutral'}>
                        {plan.suitability} Suitability
                      </Badge>
                      <Badge variant={plan.risk === 'LOW' ? 'success' : plan.risk === 'MEDIUM' ? 'warning' : 'danger'}>
                        {plan.risk} Risk
                      </Badge>
                    </div>
                  </div>

                  {/* Financial & Yield Estimates Strip */}
                  <div className="grid grid-cols-3 gap-2.5 my-4 p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Duration</span>
                      <span className="text-sm font-bold text-slate-200">{plan.duration_days} Days</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Est. Investment</span>
                      <span className="text-sm font-bold text-slate-200">
                        ₹{Number(plan.investment_expected).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Exp. Revenue</span>
                      <span className="text-sm font-bold text-emerald-400">
                        ₹{Number(plan.revenue_expected).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Reasoning & Tradeoffs */}
                  <div className="space-y-3 text-xs mb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Agronomic Reasoning
                      </span>
                      <p className="text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                        {plan.reasoning}
                      </p>
                    </div>

                    {tradeoffs.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 block mb-1">
                          Tradeoffs to Consider
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          {tradeoffs.map((t, idx) => (
                            <li key={idx}>{t.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Confidence: <strong className="text-emerald-400">{plan.confidence || 75}%</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGenerateBusinessPlan(plan)}
                      isLoading={planLoading}
                    >
                      Business Plan
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedCropForCycle(plan)}
                      icon={RotateCw}
                    >
                      Start Cycle
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <p className="text-sm text-slate-300">Click below to generate initial AI crop options.</p>
          <div className="mt-4">
            <Button onClick={() => runAnalysis(farm)} isLoading={analyzing} icon={Sparkles}>
              Generate Crop Options
            </Button>
          </div>
        </Card>
      )}

      {/* Start Crop Cycle Modal */}
      <Modal
        isOpen={!!selectedCropForCycle}
        onClose={() => setSelectedCropForCycle(null)}
        title={`Start Crop Cycle: ${selectedCropForCycle?.crop_name}`}
        subtitle="Initialize active field monitoring, growth stages, and milestone tasks"
      >
        <form onSubmit={handleStartCycle} className="space-y-4">
          <Input
            label="Seed / Variety Name"
            value={cycleVariety}
            onChange={(e) => setCycleVariety(e.target.value)}
            placeholder="e.g. JS-335, Byadgi, Saaho"
            required
          />

          <Input
            label="Sowing / Planting Date"
            type="date"
            value={cyclePlantingDate}
            onChange={(e) => setCyclePlantingDate(e.target.value)}
            required
          />

          <div className="p-3 rounded-xl bg-forest-950/60 border border-forest-500/30 text-xs text-emerald-300 space-y-1">
            <p className="font-semibold">Starting this cycle will automatically:</p>
            <p>• Switch KisanSaarthi AI from Farm Planner to Crop Manager</p>
            <p>• Schedule growth stage progression milestones</p>
            <p>• Enable weather-informed spraying & irrigation alerts</p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCropForCycle(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={cycleLoading}>
              Confirm & Start Cycle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
