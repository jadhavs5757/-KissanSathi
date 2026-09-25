import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cropService } from '../services/cropService';
import { farmService } from '../services/farmService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingScreen from '../components/ui/LoadingScreen';
import ErrorState from '../components/ui/ErrorState';
import {
  RotateCw,
  CheckCircle2,
  Calendar,
  CloudRain,
  ShieldAlert,
  Plus,
  Eye,
  AlertTriangle,
  Receipt,
  ArrowRight,
  TrendingUp,
  Check
} from 'lucide-react';

const STAGES = [
  'PLANTING',
  'GERMINATION',
  'EARLY_GROWTH',
  'VEGETATIVE',
  'FLOWERING',
  'FRUITING',
  'MATURATION',
  'HARVEST'
];

export default function CropControlCenter() {
  const { farmId, cycleId } = useParams();

  const [cycle, setCycle] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [observations, setObservations] = useState([]);
  const [weatherAction, setWeatherAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Observation modal
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [obsCategory, setObsCategory] = useState('Pest & Disease');
  const [obsDesc, setObsDesc] = useState('');
  const [obsSeverity, setObsSeverity] = useState('LOW');
  const [obsSubmitting, setObsSubmitting] = useState(false);

  const fetchCycleData = async () => {
    try {
      const [cycleData, taskList, obsList, wAction] = await Promise.all([
        cropService.getCropCycle(farmId, cycleId),
        cropService.getTasks(cycleId),
        cropService.getObservations(cycleId),
        farmService.getWeatherAction(farmId).catch(() => null)
      ]);

      setCycle(cycleData);
      setTasks(taskList);
      setObservations(obsList);
      setWeatherAction(wAction);
    } catch (err) {
      setError(err.message || 'Failed to load crop cycle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycleData();
  }, [farmId, cycleId]);

  const handleStageChange = async (newStage) => {
    try {
      const updated = await cropService.updateCropCycle(farmId, cycleId, { currentStage: newStage });
      setCycle(updated);
    } catch (err) {
      alert(err.message || 'Could not update crop stage');
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const updated = await cropService.updateTask(cycleId, taskId, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      alert(err.message || 'Could not update task');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTaskSubmitting(true);
    try {
      const task = await cropService.createTask(cycleId, {
        title: newTaskTitle,
        description: newTaskDesc || null,
        priority: newTaskPriority,
        source: 'USER',
        scheduledDate: new Date().toISOString().split('T')[0]
      });
      setTasks([...tasks, task]);
      setTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
    } catch (err) {
      alert(err.message || 'Could not add task');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleAddObservation = async (e) => {
    e.preventDefault();
    if (!obsDesc.trim()) return;
    setObsSubmitting(true);
    try {
      const obs = await cropService.addObservation(cycleId, {
        category: obsCategory,
        description: obsDesc,
        severity: obsSeverity,
        observationDate: new Date().toISOString().split('T')[0]
      });
      setObservations([obs, ...observations]);
      setObsModalOpen(false);
      setObsDesc('');
    } catch (err) {
      alert(err.message || 'Could not log observation');
    } finally {
      setObsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Initializing Crop Control Center..." />;
  }

  if (error || !cycle) {
    return <ErrorState message={error} onRetry={fetchCycleData} />;
  }

  const currentStageIndex = STAGES.indexOf(cycle.current_stage);

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-white">{cycle.crop_name}</h1>
            <Badge variant="success">Day {cycle.currentDay}</Badge>
            <Badge variant="info">{cycle.status}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Variety: <span className="text-slate-200">{cycle.variety || 'Standard Hybrid'}</span> • Planted: {cycle.planting_date} • Expected Duration: {cycle.expected_duration_days} Days
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/farms/${farmId}/expenses`}>
            <Button size="sm" variant="secondary" icon={Receipt}>
              Log Cycle Expense
            </Button>
          </Link>
          <Link to={`/farms/${farmId}/schemes`}>
            <Button size="sm" variant="outline">
              Check PMFBY Insurance
            </Button>
          </Link>
        </div>
      </div>

      {/* 8-Stage Interactive Lifecycle Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white font-display">8-Stage Lifecycle Timeline</h3>
          <span className="text-xs text-emerald-400 font-semibold">
            {cycle.progressPercent}% of cycle complete
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {STAGES.map((st, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <button
                key={st}
                onClick={() => handleStageChange(st)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-forest-600/30 border-forest-400 text-emerald-300 shadow-md scale-[1.02]'
                    : isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/20 text-slate-300 hover:border-emerald-500/40'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold">0{idx + 1}</span>
                  {isCompleted && <Check className="w-3 h-3 text-emerald-400" />}
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-forest-400 animate-pulse" />}
                </div>
                <span className="text-[11px] font-bold block truncate">{st.replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-3 text-right">
          Click any stage box above to update your active crop stage.
        </p>
      </Card>

      {/* Weather-Aware Field Advisory Banner */}
      {weatherAction && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900 border border-emerald-500/30 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-900/80 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
              <CloudRain className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-display">
                  Weather-Informed Field Advisory
                </span>
                <Badge variant={weatherAction.riskLevel === 'HIGH' ? 'danger' : 'warning'}>
                  {weatherAction.riskLevel} Climate Risk
                </Badge>
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-1">
                {weatherAction.summary}
              </p>
              <div className="mt-2 space-y-1">
                {weatherAction.actions.map((act, i) => (
                  <p key={i} className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <strong>{act.action}</strong> — {act.reason}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Grid: Tasks & Farm Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Tasks */}
        <Card>
          <CardHeader
            title="Crop Operations & Tasks"
            subtitle="Scheduled activities for this growth stage"
            action={
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setTaskModalOpen(true)}>
                Add Task
              </Button>
            }
          />

          <div className="space-y-2 mt-4">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-700 bg-slate-950'
                      }`}
                    >
                      {task.status === 'COMPLETED' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                      {task.scheduled_date && (
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          Due: {task.scheduled_date} • Source: {task.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={task.priority === 'CRITICAL' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'neutral'}>
                    {task.priority}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No tasks logged.</p>
            )}
          </div>
        </Card>

        {/* Right Column: Farm Observations */}
        <Card>
          <CardHeader
            title="Field Observations"
            subtitle="Pest scouting, soil moisture, and physical checks"
            action={
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setObsModalOpen(true)}>
                Log Observation
              </Button>
            }
          />

          <div className="space-y-2 mt-4">
            {observations.length > 0 ? (
              observations.map((obs) => (
                <div key={obs.id} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-200">{obs.category}</span>
                    <Badge variant={obs.severity === 'HIGH' ? 'danger' : obs.severity === 'MEDIUM' ? 'warning' : 'neutral'}>
                      {obs.severity} Severity
                    </Badge>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{obs.description}</p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                    Recorded on: {obs.observation_date}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No observations recorded yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Add Crop Lifecycle Task"
        subtitle="Schedule a field operation or treatment"
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <Input
            label="Task Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="e.g. Inspect lower leaves for yellow mosaic virus"
            required
          />

          <Input
            label="Description / Instructions"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder="Field notes or target dosage"
          />

          <Select
            label="Priority Level"
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            options={[
              { value: 'LOW', label: 'Low Priority' },
              { value: 'MEDIUM', label: 'Medium Priority' },
              { value: 'HIGH', label: 'High Priority' },
              { value: 'CRITICAL', label: 'Critical (Immediate)' }
            ]}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={taskSubmitting}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Observation Modal */}
      <Modal
        isOpen={obsModalOpen}
        onClose={() => setObsModalOpen(false)}
        title="Log Field Observation"
        subtitle="Record symptoms, moisture levels, or crop milestones"
      >
        <form onSubmit={handleAddObservation} className="space-y-4">
          <Select
            label="Observation Category"
            value={obsCategory}
            onChange={(e) => setObsCategory(e.target.value)}
            options={[
              { value: 'Pest & Disease', label: 'Pest & Disease Scouting' },
              { value: 'Soil Moisture', label: 'Soil Moisture & Irrigation' },
              { value: 'Weed Growth', label: 'Weed Infestation' },
              { value: 'Growth Milestone', label: 'Growth & Flowering Milestone' },
              { value: 'Weather Impact', label: 'Weather / Hail / Wind Impact' }
            ]}
          />

          <Input
            label="Observation Notes"
            value={obsDesc}
            onChange={(e) => setObsDesc(e.target.value)}
            placeholder="e.g. Slight leaf curling noticed on eastern ridge; soil is moist 2 inches down."
            required
          />

          <Select
            label="Severity Rating"
            value={obsSeverity}
            onChange={(e) => setObsSeverity(e.target.value)}
            options={[
              { value: 'LOW', label: 'Low (Informational / Normal)' },
              { value: 'MEDIUM', label: 'Medium (Requires monitoring)' },
              { value: 'HIGH', label: 'High (Immediate attention required)' }
            ]}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setObsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={obsSubmitting}>
              Save Observation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
