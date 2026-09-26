import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/LanguageContext';
import { farmService } from '../services/farmService';
import { cropService } from '../services/cropService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingScreen from '../components/ui/LoadingScreen';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import {
  Tractor,
  TrendingUp,
  CloudRain,
  RotateCw,
  Receipt,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Droplets,
  Sun,
  ShieldAlert,
  ArrowRight,
  Bot,
  Landmark
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { t, formatCurrency } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [error, setError] = useState(null);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherAction, setWeatherAction] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [expenseTotal, setExpenseTotal] = useState(0);

  const loadFarmScopedData = async (farm, forceWeatherRefresh = false) => {
    setWeatherLoading(true);
    try {
      const [cycles, weatherData] = await Promise.all([
        cropService.getCropCycles(farm.id).catch(() => []),
        farmService.getWeather(farm, { forceRefresh: forceWeatherRefresh }).catch(() => ({
          isAvailable: false,
          reason: 'Live weather unavailable'
        }))
      ]);

      const currentCycle = cycles.find((c) => c.status === 'ACTIVE') || cycles[0] || null;
      setActiveCycle(currentCycle);
      setWeather(weatherData);

      const wAction = await farmService.getWeatherAction(farm, currentCycle).catch(() => null);
      setWeatherAction(wAction);
      setExpenseTotal(Number(farm.total_expenses) || 0);

      if (currentCycle) {
        const taskList = await cropService.getTasks(currentCycle.id).catch(() => []);
        setTasks(taskList);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.warn('Error loading farm scoped data:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const farmList = await farmService.getFarms();
      setFarms(farmList);
      if (farmList.length > 0) {
        const savedId = localStorage.getItem('kisansaarthi_active_farm_id');
        const initialFarm = farmList.find((f) => f.id === savedId) || farmList[0];
        setSelectedFarm(initialFarm);
        localStorage.setItem('kisansaarthi_active_farm_id', initialFarm.id);
        await loadFarmScopedData(initialFarm);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Unable to load your farm data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFarmChange = async (newFarm) => {
    if (!newFarm || newFarm.id === selectedFarm?.id) return;
    setSelectedFarm(newFarm);
    localStorage.setItem('kisansaarthi_active_farm_id', newFarm.id);
    await loadFarmScopedData(newFarm);
  };

  const handleRefreshWeather = async () => {
    if (!selectedFarm || weatherLoading) return;
    await loadFarmScopedData(selectedFarm, true);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingScreen message="Aggregating your agricultural command center..." />;
  }

  if (error) {
    return (
      <div className="py-12 max-w-lg mx-auto">
        <ErrorState
          title="Unable to load your farm data"
          message={error}
          onRetry={loadDashboardData}
        />
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="py-8 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-white font-display">
            {t('dashboard.welcome')}, {user?.name || 'Farmer'}!
          </h1>
          <p className="text-sm text-slate-400">
            {t('dashboard.emptyDesc')}
          </p>
        </div>
        <EmptyState
          icon={Tractor}
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.emptyDesc')}
          actionText={t('dashboard.emptyAction')}
          onAction={() => (window.location.href = '/farms/new')}
        />
      </div>
    );
  }

  const budget = Number(selectedFarm?.capital_budget) || 0;
  const budgetUtilization = budget > 0 ? Math.min(100, Math.round((expenseTotal / budget) * 100)) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            {t('dashboard.title')}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs sm:text-sm text-slate-400">{t('dashboard.activeFarmPrefix')}</span>
            {farms.length > 1 ? (
              <div className="relative inline-block">
                <select
                  value={selectedFarm?.id}
                  onChange={(e) => {
                    const next = farms.find((f) => f.id === e.target.value);
                    if (next) handleFarmChange(next);
                  }}
                  className="bg-slate-900/90 border border-emerald-700/60 hover:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-slate-100">
                      🌾 {f.name} ({f.land_area_acres} {t('common.acres')}, {f.location})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs sm:text-sm text-emerald-400 font-semibold">
                {selectedFarm?.name} ({selectedFarm?.land_area_acres} {t('common.acres')}, {selectedFarm?.location})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/farms/${selectedFarm.id}/crops`}>
            <Button variant="secondary" size="sm" icon={TrendingUp}>
              {t('dashboard.cropOptions')}
            </Button>
          </Link>
          <Link to={`/farms/${selectedFarm.id}/expenses`}>
            <Button size="sm" icon={Receipt}>
              {t('dashboard.logExpense')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Priority Action Alert (Weather-Aware Translation) */}
      {weatherAction && weatherAction.actions?.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-amber-950/70 border border-emerald-500/30 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-900/80 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-display">
                  {t('dashboard.weatherAlertTitle')}
                </span>
                <Badge variant={weatherAction.riskLevel === 'HIGH' ? 'danger' : 'warning'}>
                  {weatherAction.riskLevel} Risk
                </Badge>
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-1">
                {weatherAction.actions[0].action}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{weatherAction.actions[0].reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main 4-Card KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Crop Cycle */}
        <Card hover className="relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.currentCrop')}</span>
            <RotateCw className="w-4 h-4 text-emerald-400" />
          </div>
          {activeCycle ? (
            <div>
              <h3 className="text-xl font-bold text-white font-display truncate">{activeCycle.crop_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="success">{t('common.day')} {activeCycle.currentDay}</Badge>
                <span className="text-xs text-slate-400 truncate">{activeCycle.current_stage}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">{t('common.acres')}: {activeCycle.area_acres}</span>
                <Link to={`/farms/${selectedFarm.id}/crop-cycles/${activeCycle.id}`} className="text-emerald-400 hover:underline font-semibold">
                  {t('dashboard.controlCenter')} →
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-xs text-slate-400 mb-3">{t('dashboard.noCycle')}</p>
              <Link to={`/farms/${selectedFarm.id}/crops`}>
                <Button size="sm" variant="secondary" className="w-full text-xs">
                  {t('dashboard.pickCrop')}
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Card 2: Weather & Micro-climate */}
        <Card hover>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.localWeather')}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRefreshWeather}
                disabled={weatherLoading}
                className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
                title="Refresh live weather"
                aria-label="Refresh live weather"
              >
                <RotateCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <CloudRain className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          {weatherLoading ? (
            <div className="py-2 space-y-1">
              <div className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <p className="text-xs text-cyan-400 font-medium">Fetching live weather...</p>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Connecting to live meteorological service...</p>
            </div>
          ) : weather?.isAvailable ? (
            <div>
              <div className="flex items-baseline justify-between gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-white font-display">
                    {Math.round(weather.current.temperature)}°C
                  </span>
                  <span className="text-xs text-slate-300 font-medium">{weather.current.condition}</span>
                </div>
                {weather.today?.maxTemp != null && (
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    H: {weather.today.maxTemp}° L: {weather.today.minTemp}°
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t('dashboard.humidity')}: {weather.current.humidity}% • {t('dashboard.wind')}: {weather.current.windSpeedKmh} km/h
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-300 gap-2">
                <span className="truncate">🌧 {t('dashboard.rainProb')}: {weather.today?.precipitationProbability ?? weather.forecast?.[0]?.precipitationProbability ?? 0}%</span>
                {weather.resolvedLocation && (
                  <span className="text-slate-400 text-[10px] truncate max-w-[130px]" title={weather.resolvedLocation}>
                    📍 {weather.resolvedLocation}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-amber-400 font-medium">Live weather unavailable</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {weather?.reason || 'Weather unavailable for this farm location.'}
              </p>
            </div>
          )}
        </Card>

        {/* Card 3: Water Status */}
        <Card hover>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.waterStatus')}</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-white font-display">{selectedFarm?.water_source || 'Standard Water Source'}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {selectedFarm?.water_hours_per_day ? `${selectedFarm.water_hours_per_day} ${t('dashboard.hrsPerDay')}` : t('dashboard.flexibleWater')}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
            {t('dashboard.method')}: <span className="font-medium text-emerald-300">{selectedFarm?.irrigation_method || 'Flood/Furrow'}</span>
          </div>
        </Card>

        {/* Card 4: Working Capital vs Spent */}
        <Card hover>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('dashboard.capitalInvestment')}</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white font-display">
            {formatCurrency(expenseTotal)}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
            <span>{t('dashboard.budget')}: {formatCurrency(budget)}</span>
            <span className="font-semibold text-emerald-400">{budgetUtilization}% {t('dashboard.used')}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                budgetUtilization > 90 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetUtilization}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Middle Grid: Crop Stage Tasks & AI Farm Assistant Quick Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Immediate Crop Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title={t('dashboard.tasksTitle')}
              subtitle={t('dashboard.tasksSubtitle')}
              action={
                activeCycle && (
                  <Link
                    to={`/farms/${selectedFarm.id}/crop-cycles/${activeCycle.id}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    {t('dashboard.viewAll')} ({tasks.length})
                  </Link>
                )
              }
            />

            {tasks.length > 0 ? (
              <div className="space-y-2.5">
                {tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'
                      }`}>
                        {task.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${
                          task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Badge variant={task.priority === 'CRITICAL' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'neutral'}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title={t('dashboard.noTasks')}
                description={t('dashboard.noTasksDesc')}
              />
            )}
          </Card>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to={`/farms/${selectedFarm.id}/crops`}
              className="glass-panel p-4 rounded-xl border border-emerald-950 hover:border-emerald-500/40 text-center transition-all group"
            >
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-200 block">{t('dashboard.cropPlanner')}</span>
              <span className="text-[10px] text-slate-400">{t('dashboard.cropPlannerSub')}</span>
            </Link>

            <Link
              to={`/farms/${selectedFarm.id}/expenses`}
              className="glass-panel p-4 rounded-xl border border-emerald-950 hover:border-emerald-500/40 text-center transition-all group"
            >
              <Receipt className="w-5 h-5 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-200 block">{t('dashboard.expenseLedger')}</span>
              <span className="text-[10px] text-slate-400">{t('dashboard.expenseLedgerSub')}</span>
            </Link>

            <Link
              to={`/farms/${selectedFarm.id}/schemes`}
              className="glass-panel p-4 rounded-xl border border-emerald-950 hover:border-emerald-500/40 text-center transition-all group"
            >
              <Landmark className="w-5 h-5 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-200 block">{t('dashboard.govtSubsidies')}</span>
              <span className="text-[10px] text-slate-400">{t('dashboard.govtSubsidiesSub')}</span>
            </Link>

            <Link
              to="/ai"
              className="glass-panel p-4 rounded-xl border border-emerald-950 hover:border-emerald-500/40 text-center transition-all group"
            >
              <Bot className="w-5 h-5 text-forest-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-200 block">{t('dashboard.aiAdvisor')}</span>
              <span className="text-[10px] text-slate-400">{t('dashboard.aiAdvisorSub')}</span>
            </Link>
          </div>
        </div>

        {/* Right Column: AI Assistant Card & Government Scheme Preview */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-b from-forest-950/40 to-slate-950/80 border-emerald-500/25">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">{t('dashboard.askAiTitle')}</h3>
                <p className="text-[10px] text-emerald-400">{t('dashboard.askAiSubtitle')}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {t('dashboard.askAiPrompt')}
            </p>
            <Link to="/ai">
              <Button size="sm" className="w-full" icon={ArrowRight}>
                {t('dashboard.openAi')}
              </Button>
            </Link>
          </Card>

          <Card>
            <CardHeader
              title={t('dashboard.govtSupportTitle')}
              subtitle={t('dashboard.govtSupportSub')}
              action={
                <Link to={`/farms/${selectedFarm.id}/schemes`} className="text-xs text-emerald-400 hover:underline">
                  {t('dashboard.allSchemes')} →
                </Link>
              }
            />
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">PMFBY (Crop Insurance)</span>
                  <Badge variant="success">Verified</Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Safeguards your investment against unseasonal weather risks.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">PMKSY (Micro-Irrigation)</span>
                  <Badge variant="info">Up to 55% Subsidy</Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Drip/sprinkler equipment subsidy for {selectedFarm?.water_source ? selectedFarm.water_source.toLowerCase() : 'irrigation'} systems.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
