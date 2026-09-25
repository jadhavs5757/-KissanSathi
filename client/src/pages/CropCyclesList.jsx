import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cropService } from '../services/cropService';
import { farmService } from '../services/farmService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingScreen from '../components/ui/LoadingScreen';
import EmptyState from '../components/ui/EmptyState';
import { RotateCw, Calendar, ArrowRight, TrendingUp } from 'lucide-react';

export default function CropCyclesList() {
  const { farmId } = useParams();
  const [cycles, setCycles] = useState([]);
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [farmData, cycleList] = await Promise.all([
          farmService.getFarm(farmId),
          cropService.getCropCycles(farmId)
        ]);
        setFarm(farmData);
        setCycles(cycleList);
      } catch (err) {
        console.error('Failed to load cycles:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [farmId]);

  if (loading) {
    return <LoadingScreen message="Loading crop cycles..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Crop Cycles: {farm?.name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Active and historical crop management lifecycles
          </p>
        </div>
        <Link to={`/farms/${farmId}/crops`}>
          <Button size="sm" icon={TrendingUp}>
            Pick New Crop
          </Button>
        </Link>
      </div>

      {cycles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cycles.map((c) => (
            <Card key={c.id} hover className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white font-display">{c.crop_name}</h3>
                    <p className="text-xs text-slate-400">{c.variety || 'Standard Variety'}</p>
                  </div>
                  <Badge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {c.status}
                  </Badge>
                </div>

                <div className="space-y-2.5 my-4 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Stage:</span>
                    <span className="font-bold text-emerald-400">{c.current_stage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Age:</span>
                    <span className="font-semibold text-slate-200">Day {c.currentDay} / {c.expected_duration_days}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Planted:</span>
                    <span className="font-semibold text-slate-200">{c.planting_date}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Cycle Progress</span>
                      <span>{c.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-forest-500 h-1.5 rounded-full"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                <Link to={`/farms/${farmId}/crop-cycles/${c.id}`}>
                  <Button size="sm" icon={ArrowRight}>
                    Control Center
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={RotateCw}
          title="No crop cycles started yet"
          description="Select a recommended crop from your farm analysis to initialize your Crop Control Center."
          actionText="View Crop Options"
          onAction={() => (window.location.href = `/farms/${farmId}/crops`)}
        />
      )}
    </div>
  );
}
