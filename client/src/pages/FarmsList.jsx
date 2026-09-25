import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { farmService } from '../services/farmService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingScreen from '../components/ui/LoadingScreen';
import EmptyState from '../components/ui/EmptyState';
import { Tractor, Plus, MapPin, Droplets, FlaskConical, IndianRupee, ArrowRight, Trash2 } from 'lucide-react';

export default function FarmsList() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFarms = async () => {
    try {
      const data = await farmService.getFarms();
      setFarms(data);
    } catch (err) {
      console.error('Failed to load farms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleDelete = async (farmId, e) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this farm? All associated plans, cycles, and expenses will be permanently deleted.')) {
      try {
        await farmService.deleteFarm(farmId);
        setFarms(farms.filter((f) => f.id !== farmId));
      } catch (err) {
        alert(err.message || 'Could not delete farm');
      }
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your digital farms..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">My Farms</h1>
          <p className="text-xs text-slate-400 mt-1">Manage your agricultural land holdings, soil profiles, and water infrastructure</p>
        </div>
        <Link to="/farms/new">
          <Button icon={Plus} size="sm">
            Add New Farm
          </Button>
        </Link>
      </div>

      {farms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Card key={farm.id} hover className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white font-display">{farm.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{farm.location}</span>
                    </div>
                  </div>
                  <Badge variant={farm.ownership === 'OWN' ? 'success' : 'warning'}>
                    {farm.ownership}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 my-4 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Land Area</span>
                    <span className="font-bold text-slate-200">{farm.land_area_acres} Acres</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Water Source</span>
                    <span className="font-bold text-slate-200 truncate block">{farm.water_source}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Soil Type</span>
                    <span className="font-bold text-slate-200 truncate block">{farm.soil_type || 'Unspecified'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Working Budget</span>
                    <span className="font-bold text-emerald-400 truncate block">₹{Number(farm.capital_budget).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => handleDelete(farm.id, e)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Delete Farm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <Link to={`/farms/${farm.id}/crops`}>
                    <Button variant="secondary" size="sm">
                      Crop Options
                    </Button>
                  </Link>
                  <Link to={`/farms/${farm.id}`}>
                    <Button size="sm" icon={ArrowRight}>
                      Overview
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Tractor}
          title="No farms registered yet"
          description="Create your first farm profile to start generating AI crop recommendations and managing expenses."
          actionText="Create Farm Profile"
          onAction={() => (window.location.href = '/farms/new')}
        />
      )}
    </div>
  );
}
