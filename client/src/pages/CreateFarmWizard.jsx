import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { farmService } from '../services/farmService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import {
  Tractor,
  Layers,
  Droplets,
  Coins,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Info,
  Sparkles
} from 'lucide-react';

export default function CreateFarmWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Step 1: Land
    name: 'Green Field Plot A',
    location: 'Nashik, Maharashtra',
    land_area_acres: 2.0,
    ownership: 'OWN',
    previous_crop: 'Soybean',
    // Step 2: Soil
    soil_source: 'SOIL_HEALTH_CARD',
    soil_type: 'Medium Black Clay Loam',
    soil_ph: 7.2,
    nitrogen: 240,
    phosphorus: 22,
    potassium: 310,
    organic_carbon: 0.55,
    // Step 3: Water
    water_source: 'BOREWELL',
    pump_capacity_hp: 5.0,
    water_hours_per_day: 6.0,
    irrigation_method: 'Drip System & Furrow',
    rain_dependence_percent: 40,
    // Step 4: Resources & Budget
    capital_budget: 80000,
    labour_description: 'Family labour + hired daily pickers',
    equipment_description: 'Own power tiller, shared tractor access',
    storage_available: true,
    electricity_available: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError('');

    // Validation per step
    if (currentStep === 1) {
      if (!formData.name.trim()) return setError('Farm name is required.');
      if (!formData.location.trim()) return setError('Location is required.');
      if (Number(formData.land_area_acres) <= 0) return setError('Land area must be greater than 0.');
    }
    if (currentStep === 4) {
      if (Number(formData.capital_budget) < 0) return setError('Capital budget must be positive or 0.');
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        land_area_acres: Number(formData.land_area_acres),
        capital_budget: Number(formData.capital_budget),
        soil_ph: formData.soil_ph ? Number(formData.soil_ph) : null,
        nitrogen: formData.nitrogen ? Number(formData.nitrogen) : null,
        phosphorus: formData.phosphorus ? Number(formData.phosphorus) : null,
        potassium: formData.potassium ? Number(formData.potassium) : null,
        organic_carbon: formData.organic_carbon ? Number(formData.organic_carbon) : null,
        pump_capacity_hp: formData.pump_capacity_hp ? Number(formData.pump_capacity_hp) : null,
        water_hours_per_day: formData.water_hours_per_day ? Number(formData.water_hours_per_day) : null,
        rain_dependence_percent: formData.rain_dependence_percent ? Number(formData.rain_dependence_percent) : null
      };

      const newFarm = await farmService.createFarm(payload);
      // Seamlessly navigate to crop options to start analysis!
      navigate(`/farms/${newFarm.id}/crops?first=true`);
    } catch (err) {
      setError(err.message || 'Failed to save farm profile. Please review fields.');
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Land', icon: Tractor },
    { num: 2, label: 'Soil', icon: Layers },
    { num: 3, label: 'Water', icon: Droplets },
    { num: 4, label: 'Budget', icon: Coins },
    { num: 5, label: 'Review', icon: CheckCircle }
  ];

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Wizard Progress Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-emerald-950">
        <div className="flex items-center justify-between">
          {steps.map((st) => (
            <div key={st.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === st.num
                    ? 'bg-forest-500 text-white shadow-lg shadow-forest-900/50 scale-105'
                    : currentStep > st.num
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {currentStep > st.num ? <CheckCircle className="w-4 h-4" /> : st.num}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${
                currentStep === st.num ? 'text-white font-semibold' : 'text-slate-400'
              }`}>
                {st.label}
              </span>
              {st.num < 5 && <div className="hidden sm:block w-8 h-[1px] bg-slate-800 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card className="p-8">
        {/* Step 1: Land Details */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Step 1: Land Basics</h2>
              <p className="text-xs text-slate-400 mt-1">Specify your land area, location, and previous crop history</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Farm Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Ganga Plot 1"
                required
              />

              <Input
                label="Location (District, State)"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Nashik, Maharashtra"
                required
              />

              <Input
                label="Land Area (in Acres)"
                name="land_area_acres"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.land_area_acres}
                onChange={handleChange}
                required
              />

              <Select
                label="Ownership Status"
                name="ownership"
                value={formData.ownership}
                onChange={handleChange}
                options={[
                  { value: 'OWN', label: 'Owned Land' },
                  { value: 'LEASE', label: 'Leased Land' }
                ]}
                required
              />

              <div className="sm:col-span-2">
                <Input
                  label="Previous Crop Cultivated"
                  name="previous_crop"
                  value={formData.previous_crop}
                  onChange={handleChange}
                  placeholder="e.g. Soybean, Cotton, Wheat, Fallow"
                  helper="Crop rotation history helps assess residual soil nutrients and disease cycles"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Soil Profile */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Step 2: Soil Profile</h2>
              <p className="text-xs text-slate-400 mt-1">Laboratory test or Soil Health Card measurements</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Safety Boundary: Exact NPK values cannot be derived from a smartphone photograph. Please enter values from an official Soil Health Card or lab report, or choose Unknown.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Soil Data Source"
                name="soil_source"
                value={formData.soil_source}
                onChange={handleChange}
                options={[
                  { value: 'SOIL_HEALTH_CARD', label: 'Soil Health Card (Govt Scheme)' },
                  { value: 'LAB_TEST', label: 'Authorized Testing Lab Report' },
                  { value: 'USER_ENTERED', label: 'Farmer Estimate / Self-Entered' },
                  { value: 'UNKNOWN', label: 'Unknown / Insufficient Data' }
                ]}
              />

              <Input
                label="Soil Type"
                name="soil_type"
                value={formData.soil_type}
                onChange={handleChange}
                placeholder="e.g. Black Clay, Alluvial, Red Sandy, Loamy"
              />

              <Input
                label="Soil pH (0 - 14)"
                name="soil_ph"
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={formData.soil_ph}
                onChange={handleChange}
                placeholder="e.g. 7.2"
                helper="Neutral range: 6.5 - 7.5"
              />

              <Input
                label="Organic Carbon (%)"
                name="organic_carbon"
                type="number"
                step="0.01"
                value={formData.organic_carbon}
                onChange={handleChange}
                placeholder="e.g. 0.55"
              />

              <Input
                label="Available Nitrogen (N kg/ha)"
                name="nitrogen"
                type="number"
                value={formData.nitrogen}
                onChange={handleChange}
                placeholder="e.g. 240"
              />

              <Input
                label="Available Phosphorus (P kg/ha)"
                name="phosphorus"
                type="number"
                value={formData.phosphorus}
                onChange={handleChange}
                placeholder="e.g. 22"
              />

              <Input
                label="Available Potassium (K kg/ha)"
                name="potassium"
                type="number"
                value={formData.potassium}
                onChange={handleChange}
                placeholder="e.g. 310"
              />
            </div>
          </div>
        )}

        {/* Step 3: Water Infrastructure */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Step 3: Water & Irrigation</h2>
              <p className="text-xs text-slate-400 mt-1">Specify water source capacity and irrigation delivery methods</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Primary Water Source"
                name="water_source"
                value={formData.water_source}
                onChange={handleChange}
                options={[
                  { value: 'BOREWELL', label: 'Borewell' },
                  { value: 'OPEN_WELL', label: 'Open Well' },
                  { value: 'CANAL', label: 'Canal Irrigation' },
                  { value: 'RIVER', label: 'River Lift' },
                  { value: 'TANK', label: 'Farm Pond / Tank' },
                  { value: 'RAINFED', label: 'Rainfed (No Irrigation)' },
                  { value: 'COMBINATION', label: 'Combination (Borewell + Pond)' }
                ]}
                required
              />

              <Input
                label="Pump Capacity (HP)"
                name="pump_capacity_hp"
                type="number"
                step="0.5"
                value={formData.pump_capacity_hp}
                onChange={handleChange}
                placeholder="e.g. 5"
              />

              <Input
                label="Water Availability (Hours / Day)"
                name="water_hours_per_day"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.water_hours_per_day}
                onChange={handleChange}
                placeholder="e.g. 6"
              />

              <Input
                label="Irrigation Method"
                name="irrigation_method"
                value={formData.irrigation_method}
                onChange={handleChange}
                placeholder="e.g. Drip, Sprinkler, Furrow, Basin"
              />

              <div className="sm:col-span-2">
                <Input
                  label="Rain Dependence (% of overall water supply)"
                  name="rain_dependence_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.rain_dependence_percent}
                  onChange={handleChange}
                  placeholder="e.g. 40"
                  helper="Higher rain dependence increases climate risk during dry spells"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Budget & Farm Resources */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Step 4: Working Budget & Resources</h2>
              <p className="text-xs text-slate-400 mt-1">Available capital, machinery, labor, and storage</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Total Working Capital Budget (₹ INR)"
                  name="capital_budget"
                  type="number"
                  min="0"
                  value={formData.capital_budget}
                  onChange={handleChange}
                  placeholder="e.g. 80000"
                  helper="Budget helps AI filter crops you can afford to cultivate comfortably"
                  required
                />
              </div>

              <Input
                label="Labour Availability"
                name="labour_description"
                value={formData.labour_description}
                onChange={handleChange}
                placeholder="e.g. Family labour + hired seasonal workers"
              />

              <Input
                label="Equipment & Machinery"
                name="equipment_description"
                value={formData.equipment_description}
                onChange={handleChange}
                placeholder="e.g. Power tiller, custom hiring center nearby"
              />

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <input
                  type="checkbox"
                  id="storage_available"
                  name="storage_available"
                  checked={formData.storage_available}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-forest-600 focus:ring-forest-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="storage_available" className="text-xs text-slate-200 cursor-pointer">
                  Warehouse or Covered Storage Available on Farm
                </label>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <input
                  type="checkbox"
                  id="electricity_available"
                  name="electricity_available"
                  checked={formData.electricity_available}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-forest-600 focus:ring-forest-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="electricity_available" className="text-xs text-slate-200 cursor-pointer">
                  3-Phase Farm Electricity Connection Available
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Save */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white font-display">Step 5: Review Farm Profile</h2>
              <p className="text-xs text-slate-400 mt-1">Review your farm details before generating AI crop options</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Land Profile</h4>
                <p><span className="text-slate-400">Name:</span> {formData.name}</p>
                <p><span className="text-slate-400">Location:</span> {formData.location}</p>
                <p><span className="text-slate-400">Area:</span> {formData.land_area_acres} Acres ({formData.ownership})</p>
                <p><span className="text-slate-400">Previous Crop:</span> {formData.previous_crop || 'None'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Soil & Water</h4>
                <p><span className="text-slate-400">Soil:</span> {formData.soil_type || 'Unspecified'} (pH: {formData.soil_ph || 'N/A'})</p>
                <p><span className="text-slate-400">Source:</span> {formData.soil_source}</p>
                <p><span className="text-slate-400">Water:</span> {formData.water_source} ({formData.water_hours_per_day || 0} hrs/day)</p>
                <p><span className="text-slate-400">Method:</span> {formData.irrigation_method || 'Standard'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 sm:col-span-2">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Financial & Capital Resources</h4>
                <p><span className="text-slate-400">Working Budget:</span> <span className="font-bold text-emerald-400">₹{Number(formData.capital_budget).toLocaleString('en-IN')}</span></p>
                <p><span className="text-slate-400">Labour:</span> {formData.labour_description || 'Standard'}</p>
                <p><span className="text-slate-400">Machinery:</span> {formData.equipment_description || 'Standard'}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-forest-950/60 border border-forest-500/30 flex items-center gap-3 text-xs text-emerald-300">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Saving this farm profile will immediately trigger AI crop recommendation and scenario generation tailored to these constraints.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
          {currentStep > 1 ? (
            <Button variant="outline" size="sm" onClick={handleBack} icon={ArrowLeft}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <Button size="sm" onClick={handleNext} icon={ArrowRight}>
              Continue
            </Button>
          ) : (
            <Button size="lg" isLoading={loading} onClick={handleSave} icon={Sparkles}>
              Save Farm & Generate Crop Options
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
