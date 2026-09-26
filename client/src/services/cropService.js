import supabase from '../config/supabase';
import api from './api';

export const cropService = {
  /**
   * Invoke the Supabase Edge Function to analyze farm agro-climatic conditions
   * and generate crop suitability recommendations using Gemini 2.5 Flash.
   */
  async analyzeFarm(farmId, preferences = {}) {
    const { data, error } = await supabase.functions.invoke('crop-recommendations', {
      body: { farmId, preferences }
    });

    if (error) {
      console.error('Supabase crop-recommendations Edge Function error:', error);
      throw new Error(error.message || 'Crop recommendation analysis failed.');
    }

    if (!data?.success && data?.error) {
      throw new Error(data.error.message || 'Crop recommendation analysis failed.');
    }

    return data?.data || data;
  },

  /**
   * Fetch generated crop plans for a given farm directly from Supabase public.crop_plans.
   */
  async getCropPlans(farmId) {
    try {
      const { data, error } = await supabase
        .from('crop_plans')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getCropPlans error, falling back to api:', err);
    }

    const res = await api.get(`/farms/${farmId}/crop-plans`).catch(() => ({ data: {} }));
    return res.data?.cropPlans || [];
  },

  /**
   * Fetch a single crop plan by ID.
   */
  async getCropPlan(farmId, planId) {
    try {
      const { data, error } = await supabase
        .from('crop_plans')
        .select('*')
        .eq('farm_id', farmId)
        .eq('id', planId)
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getCropPlan error, falling back to api:', err);
    }

    const res = await api.get(`/farms/${farmId}/crop-plans/${planId}`);
    return res.data?.cropPlan;
  },

  // Business plans remain on Express backend during this phase
  async createBusinessPlan(farmId, planData) {
    const res = await api.post(`/farms/${farmId}/business-plans`, planData);
    return res.data?.businessPlan;
  },

  async getBusinessPlans(farmId) {
    const res = await api.get(`/farms/${farmId}/business-plans`);
    return res.data?.businessPlans || [];
  },

  async getBusinessPlan(farmId, planId) {
    const res = await api.get(`/farms/${farmId}/business-plans/${planId}`);
    return res.data?.businessPlan;
  },

  /**
   * Fetch all crop cycles for a farm directly from Supabase public.crop_cycles.
   */
  async getCropCycles(farmId) {
    const { data, error } = await supabase
      .from('crop_cycles')
      .select('*, crop_tasks(id, status)')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching crop cycles:', error);
      throw new Error(error.message || 'Failed to fetch crop cycles');
    }

    return (data || []).map((cycle) => {
      const tasks = cycle.crop_tasks || [];
      const pending_tasks_count = tasks.filter((t) => t.status === 'PENDING').length;
      const completed_tasks_count = tasks.filter((t) => t.status === 'COMPLETED').length;
      return enrichCycleMetadata({
        ...cycle,
        pending_tasks_count,
        completed_tasks_count
      });
    });
  },

  /**
   * Fetch a single crop cycle by ID with farm context from Supabase.
   */
  async getCropCycle(farmId, cycleId) {
    const { data, error } = await supabase
      .from('crop_cycles')
      .select('*, farms(name, location, water_source, capital_budget)')
      .eq('id', cycleId)
      .single();

    if (error) {
      console.error('Error fetching crop cycle:', error);
      throw new Error(error.message || 'Failed to fetch crop cycle');
    }

    const farmInfo = data.farms || {};
    const cycle = {
      ...data,
      farm_name: farmInfo.name,
      farm_location: farmInfo.location,
      water_source: farmInfo.water_source,
      capital_budget: farmInfo.capital_budget
    };

    return enrichCycleMetadata(cycle);
  },

  /**
   * Create a new crop cycle in Supabase and automatically schedule initial milestone tasks.
   */
  async createCropCycle(farmId, cycleData) {
    const {
      cropPlanId = null,
      crop_plan_id = null,
      cropName,
      crop_name,
      variety = null,
      areaAcres,
      area_acres,
      plantingDate,
      planting_date,
      expectedDurationDays,
      expected_duration_days,
      currentStage = 'PLANTING',
      current_stage,
      status = 'ACTIVE'
    } = cycleData;

    const cyclePayload = {
      farm_id: farmId,
      crop_plan_id: cropPlanId || crop_plan_id || null,
      crop_name: cropName || crop_name,
      variety: variety || null,
      area_acres: Number(areaAcres || area_acres),
      planting_date: plantingDate || planting_date,
      expected_duration_days: Number(expectedDurationDays || expected_duration_days),
      current_stage: currentStage || current_stage || 'PLANTING',
      status: status || 'ACTIVE'
    };

    const { data: cycle, error: cycleErr } = await supabase
      .from('crop_cycles')
      .insert([cyclePayload])
      .select()
      .single();

    if (cycleErr) {
      console.error('Error creating crop cycle:', cycleErr);
      throw new Error(cycleErr.message || 'Failed to start crop cycle');
    }

    // Auto-generate standard milestone tasks for the crop cycle
    const baseDate = new Date(cyclePayload.planting_date);
    const initialTasks = [
      {
        crop_cycle_id: cycle.id,
        title: 'Basal Soil Nutrition & Seed Treatment',
        description: 'Incorporate compost/FYM and basal fertilizer. Treat seeds with Trichoderma or bio-fertilizer.',
        scheduled_date: cyclePayload.planting_date,
        priority: 'HIGH',
        status: 'PENDING',
        source: 'SYSTEM'
      },
      {
        crop_cycle_id: cycle.id,
        title: 'First Emergence & Gap Filling Inspection',
        description: 'Check germination stand uniformity 7-10 days after sowing. Fill missing gaps.',
        scheduled_date: new Date(baseDate.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'MEDIUM',
        status: 'PENDING',
        source: 'SYSTEM'
      },
      {
        crop_cycle_id: cycle.id,
        title: 'First Intercultural Weeding & Hoeing',
        description: 'Weed removal around root perimeter to avoid nutrient competition during early growth.',
        scheduled_date: new Date(baseDate.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'HIGH',
        status: 'PENDING',
        source: 'SYSTEM'
      },
      {
        crop_cycle_id: cycle.id,
        title: 'Vegetative Top-Dressing & Irrigation Review',
        description: 'Apply split nitrogen dose and inspect soil moisture before critical stem elongation.',
        scheduled_date: new Date(baseDate.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'MEDIUM',
        status: 'PENDING',
        source: 'SYSTEM'
      },
      {
        crop_cycle_id: cycle.id,
        title: 'Flowering Stage Moisture & Pest Scouting',
        description: 'Strictly maintain optimal root moisture to prevent flower drop. Scout for sucking pests.',
        scheduled_date: new Date(baseDate.getTime() + 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'CRITICAL',
        status: 'PENDING',
        source: 'SYSTEM'
      }
    ];

    const { error: taskErr } = await supabase.from('crop_tasks').insert(initialTasks);
    if (taskErr) {
      console.warn('Milestone tasks auto-generation notice:', taskErr);
    }

    return enrichCycleMetadata(cycle);
  },

  /**
   * Update crop cycle stage or details in Supabase.
   */
  async updateCropCycle(farmId, cycleId, cycleData) {
    const updates = {};
    if (cycleData.currentStage !== undefined) updates.current_stage = cycleData.currentStage;
    if (cycleData.current_stage !== undefined) updates.current_stage = cycleData.current_stage;
    if (cycleData.status !== undefined) updates.status = cycleData.status;
    if (cycleData.variety !== undefined) updates.variety = cycleData.variety;
    if (cycleData.expectedDurationDays !== undefined) updates.expected_duration_days = cycleData.expectedDurationDays;
    if (cycleData.expected_duration_days !== undefined) updates.expected_duration_days = cycleData.expected_duration_days;

    const { data, error } = await supabase
      .from('crop_cycles')
      .update(updates)
      .eq('id', cycleId)
      .select('*, farms(name, location, water_source, capital_budget)')
      .single();

    if (error) {
      console.error('Error updating crop cycle:', error);
      throw new Error(error.message || 'Failed to update crop cycle');
    }

    const farmInfo = data.farms || {};
    return enrichCycleMetadata({
      ...data,
      farm_name: farmInfo.name,
      farm_location: farmInfo.location,
      water_source: farmInfo.water_source,
      capital_budget: farmInfo.capital_budget
    });
  },

  /**
   * Fetch scheduled tasks for a crop cycle from Supabase.
   */
  async getTasks(cycleId) {
    const { data, error } = await supabase
      .from('crop_tasks')
      .select('*')
      .eq('crop_cycle_id', cycleId)
      .order('scheduled_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching cycle tasks:', error);
      throw new Error(error.message || 'Failed to fetch tasks');
    }

    return data || [];
  },

  /**
   * Create a new task for a crop cycle in Supabase.
   */
  async createTask(cycleId, taskData) {
    const {
      title,
      description = null,
      scheduledDate = null,
      scheduled_date = null,
      priority = 'MEDIUM',
      source = 'USER'
    } = taskData;

    const payload = {
      crop_cycle_id: cycleId,
      title,
      description,
      scheduled_date: scheduledDate || scheduled_date || null,
      priority: priority || 'MEDIUM',
      status: 'PENDING',
      source: source || 'USER'
    };

    const { data, error } = await supabase
      .from('crop_tasks')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw new Error(error.message || 'Failed to create task');
    }

    return data;
  },

  /**
   * Update task status or fields in Supabase.
   */
  async updateTask(cycleId, taskId, taskData) {
    const updates = {};
    if (taskData.title !== undefined) updates.title = taskData.title;
    if (taskData.description !== undefined) updates.description = taskData.description;
    if (taskData.scheduledDate !== undefined) updates.scheduled_date = taskData.scheduledDate;
    if (taskData.scheduled_date !== undefined) updates.scheduled_date = taskData.scheduled_date;
    if (taskData.priority !== undefined) updates.priority = taskData.priority;
    if (taskData.status !== undefined) updates.status = taskData.status;

    const { data, error } = await supabase
      .from('crop_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw new Error(error.message || 'Failed to update task');
    }

    return data;
  },

  /**
   * Fetch observations for a crop cycle from Supabase.
   */
  async getObservations(cycleId) {
    const { data, error } = await supabase
      .from('farm_observations')
      .select('*')
      .eq('crop_cycle_id', cycleId)
      .order('observation_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching observations:', error);
      throw new Error(error.message || 'Failed to fetch observations');
    }

    return data || [];
  },

  /**
   * Add a new field observation to Supabase.
   */
  async addObservation(cycleId, obsData) {
    const {
      category,
      description,
      severity = 'LOW',
      observationDate = null,
      observation_date = null
    } = obsData;

    const payload = {
      crop_cycle_id: cycleId,
      category,
      description,
      severity: severity || 'LOW',
      observation_date: observationDate || observation_date || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('farm_observations')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding observation:', error);
      throw new Error(error.message || 'Failed to log observation');
    }

    return data;
  }
};

/**
 * Helper function to calculate cycle age, progress percentage, and stage timelines
 * exactly matching the Express backend metadata contract.
 */
function enrichCycleMetadata(cycle) {
  if (!cycle) return null;
  const plantDate = new Date(cycle.planting_date);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - plantDate.getTime());
  const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = Number(cycle.expected_duration_days) || 120;
  const progressPercent = Math.min(100, Math.round((currentDay / totalDays) * 100));

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

  const currentStageIndex = STAGES.indexOf(cycle.current_stage);

  return {
    ...cycle,
    currentDay,
    progressPercent,
    stages: STAGES.map((s, idx) => ({
      name: s,
      isCompleted: idx < currentStageIndex,
      isCurrent: idx === currentStageIndex,
      isUpcoming: idx > currentStageIndex
    }))
  };
}
