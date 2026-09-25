import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { farmService } from '../services/farmService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import {
  Tractor,
  TrendingUp,
  MapPin,
  Droplets,
  Layers,
  Coins,
  Warehouse,
  Zap,
  ArrowRight,
  Sparkles,
  Receipt,
  RotateCw
} from 'lucide-react';

export default function FarmDetails() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFarm() {
      setLoading(true);
      try {
        const data = await farmService.getFarm(farmId);
        setFarm(data);
      } catch (err) {
        setError(err.message || 'Could not load farm details');
      } finally {
        setLoading(false);
      }
    }
    loadFarm();
  }, [farmId]);

  if (loading) {
    return <LoadingScreen message="Loading farm parameters..." />;
  }

  if (error || !farm) {
    return <ErrorState message={error} onRetry={() => navigate('/farms')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-white">{farm.name}</h1>
            <Badge variant={farm.ownership === 'OWN' ? 'success' : 'warning'}>
              {farm.ownership}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{farm.location}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/farms/${farm.id}/crops`}>
            <Button size="sm" icon={Sparkles}>
              AI Crop Analysis
            </Button>
          </Link>
          <Link to={`/farms/${farm.id}/crop-cycles`}>
            <Button variant="secondary" size="sm" icon={RotateCw}>
              Cycles
            </Button>
          </Link>
          <Link to={`/farms/${farm.id}/expenses`}>
            <Button variant="outline" size="sm" icon={Receipt}>
              Expenses
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid of Profile Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Land & Crop Rotation */}
        <Card>
          <CardHeader title="Land & Acreage" subtitle="Land title and rotation records" />
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Total Land Area:</span>
              <span className="font-bold text-slate-200">{farm.land_area_acres} Acres</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Ownership Type:</span>
              <span className="font-bold text-slate-200">{farm.ownership === 'OWN' ? 'Owned' : 'Leased'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Previous Crop:</span>
              <span className="font-bold text-emerald-400">{farm.previous_crop || 'None reported'}</span>
            </div>
          </div>
        </Card>

        {/* Soil Health Details */}
        <Card>
          <CardHeader title="Soil Chemistry & Texture" subtitle={`Source: ${farm.soil_source}`} />
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Soil Type:</span>
              <span className="font-bold text-slate-200">{farm.soil_type || 'Unspecified'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Soil pH:</span>
              <span className="font-bold text-slate-200">{farm.soil_ph ?? 'Not tested'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">NPK (N - P - K kg/ha):</span>
              <span className="font-bold text-slate-200">
                {farm.nitrogen ?? '-'} : {farm.phosphorus ?? '-'} : {farm.potassium ?? '-'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Organic Carbon:</span>
              <span className="font-bold text-slate-200">{farm.organic_carbon ? `${farm.organic_carbon}%` : 'Not tested'}</span>
            </div>
          </div>
        </Card>

        {/* Water Infrastructure */}
        <Card>
          <CardHeader title="Water & Irrigation" subtitle="Irrigation capacity and rain dependency" />
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Water Source:</span>
              <span className="font-bold text-slate-200">{farm.water_source}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Pump Capacity:</span>
              <span className="font-bold text-slate-200">{farm.pump_capacity_hp ? `${farm.pump_capacity_hp} HP` : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Operational Hours:</span>
              <span className="font-bold text-slate-200">{farm.water_hours_per_day ? `${farm.water_hours_per_day} hrs/day` : 'Flexible'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Irrigation Method:</span>
              <span className="font-bold text-emerald-400">{farm.irrigation_method || 'Standard'}</span>
            </div>
          </div>
        </Card>

        {/* Financial & Farm Assets */}
        <Card>
          <CardHeader title="Capital & Infrastructure" subtitle="Working capital and operational assets" />
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Planned Capital Budget:</span>
              <span className="font-bold text-emerald-400">₹{Number(farm.capital_budget).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Warehouse Storage:</span>
              <span className="font-bold text-slate-200">{farm.storage_available ? 'Available' : 'No'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Farm Electricity:</span>
              <span className="font-bold text-slate-200">{farm.electricity_available ? '3-Phase Connected' : 'None'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Total Recorded Expenses:</span>
              <span className="font-bold text-slate-200">₹{Number(farm.total_expenses || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
