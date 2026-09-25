import { query } from '../config/database.js';
import { getFarmById } from './farm.service.js';

export async function createCropCycle(farmId, userId, cycleData) {
  // Verify farm ownership
  await getFarmById(farmId, userId);

  const {
    cropPlanId = null,
    cropName,
    variety = null,
    areaAcres,
    plantingDate,
    expectedDurationDays,
    currentStage = 'PLANTING',
    status = 'ACTIVE'
  } = cycleData;

  const cycleRes = await query(
    `INSERT INTO crop_cycles (
      farm_id, crop_plan_id, crop_name, variety, area_acres,
      planting_date, expected_duration_days, current_stage, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      farmId,
      cropPlanId,
      cropName,
      variety,
      areaAcres,
      plantingDate,
      expectedDurationDays,
      currentStage,
      status
    ]
  );

  const cycle = cycleRes.rows[0];

  // Auto-generate standard milestone tasks for the crop cycle
  const initialTasks = [
    {
      title: 'Basal Soil Nutrition & Seed Treatment',
      description: 'Incorporate compost/FYM and basal fertilizer. Treat seeds with Trichoderma or bio-fertilizer.',
      scheduled_date: plantingDate,
      priority: 'HIGH',
      source: 'SYSTEM'
    },
    {
      title: 'First Emergence & Gap Filling Inspection',
      description: 'Check germination stand uniformity 7-10 days after sowing. Fill missing gaps.',
      scheduled_date: new Date(new Date(plantingDate).getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'MEDIUM',
      source: 'SYSTEM'
    },
    {
      title: 'First Intercultural Weeding & Hoeing',
      description: 'Weed removal around root perimeter to avoid nutrient competition during early growth.',
      scheduled_date: new Date(new Date(plantingDate).getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'HIGH',
      source: 'SYSTEM'
    },
    {
      title: 'Vegetative Top-Dressing & Irrigation Review',
      description: 'Apply split nitrogen dose and inspect soil moisture before critical stem elongation.',
      scheduled_date: new Date(new Date(plantingDate).getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'MEDIUM',
      source: 'SYSTEM'
    },
    {
      title: 'Flowering Stage Moisture & Pest Scouting',
      description: 'Strictly maintain optimal root moisture to prevent flower drop. Scout for sucking pests.',
      scheduled_date: new Date(new Date(plantingDate).getTime() + 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'CRITICAL',
      source: 'SYSTEM'
    }
  ];

  for (const t of initialTasks) {
    await query(
      `INSERT INTO crop_tasks (crop_cycle_id, title, description, scheduled_date, priority, status, source)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)`,
      [cycle.id, t.title, t.description, t.scheduled_date, t.priority, t.source]
    );
  }

  return cycle;
}

export async function getFarmCropCycles(farmId, userId) {
  await getFarmById(farmId, userId);

  const res = await query(
    `SELECT cc.*,
      (SELECT COUNT(*) FROM crop_tasks ct WHERE ct.crop_cycle_id = cc.id AND ct.status = 'PENDING') AS pending_tasks_count,
      (SELECT COUNT(*) FROM crop_tasks ct WHERE ct.crop_cycle_id = cc.id AND ct.status = 'COMPLETED') AS completed_tasks_count,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE e.crop_cycle_id = cc.id) AS cycle_expenses
     FROM crop_cycles cc
     WHERE cc.farm_id = $1
     ORDER BY cc.created_at DESC`,
    [farmId]
  );

  return res.rows.map(enrichCycleMetadata);
}

export async function getCropCycleById(farmId, cycleId, userId) {
  // Join with farms to verify user ownership
  const sql = `
    SELECT cc.*, f.name AS farm_name, f.location AS farm_location, f.water_source, f.capital_budget,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE e.crop_cycle_id = cc.id) AS cycle_expenses
    FROM crop_cycles cc
    JOIN farms f ON f.id = cc.farm_id
    WHERE cc.id = $1 AND f.user_id = $2
  `;
  const res = await query(sql, [cycleId, userId]);

  if (res.rows.length === 0) {
    const error = new Error('Crop cycle not found.');
    error.statusCode = 404;
    error.code = 'CROP_CYCLE_NOT_FOUND';
    throw error;
  }

  return enrichCycleMetadata(res.rows[0]);
}

export async function updateCropCycle(farmId, cycleId, userId, updateData) {
  // Verify ownership
  await getCropCycleById(farmId, cycleId, userId);

  const fields = [];
  const values = [];
  let idx = 1;

  if (updateData.variety !== undefined) {
    fields.push(`variety = $${idx++}`);
    values.push(updateData.variety);
  }
  if (updateData.currentStage !== undefined) {
    fields.push(`current_stage = $${idx++}`);
    values.push(updateData.currentStage);
  }
  if (updateData.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(updateData.status);
  }
  if (updateData.expectedDurationDays !== undefined) {
    fields.push(`expected_duration_days = $${idx++}`);
    values.push(updateData.expectedDurationDays);
  }

  if (fields.length === 0) {
    return getCropCycleById(farmId, cycleId, userId);
  }

  values.push(cycleId);
  const sql = `UPDATE crop_cycles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const res = await query(sql, values);
  return enrichCycleMetadata(res.rows[0]);
}

export async function deleteCropCycle(farmId, cycleId, userId) {
  await getCropCycleById(farmId, cycleId, userId);
  await query('DELETE FROM crop_cycles WHERE id = $1', [cycleId]);
  return { deleted: true, id: cycleId };
}

// Tasks
export async function getCycleTasks(cycleId, userId) {
  // Ensure user owns this cycle
  const cycleRes = await query(
    `SELECT cc.id FROM crop_cycles cc JOIN farms f ON f.id = cc.farm_id WHERE cc.id = $1 AND f.user_id = $2`,
    [cycleId, userId]
  );
  if (cycleRes.rows.length === 0) {
    const error = new Error('Crop cycle not found.');
    error.statusCode = 404;
    error.code = 'CROP_CYCLE_NOT_FOUND';
    throw error;
  }

  const res = await query(
    'SELECT * FROM crop_tasks WHERE crop_cycle_id = $1 ORDER BY scheduled_date ASC, created_at ASC',
    [cycleId]
  );
  return res.rows;
}

export async function createCycleTask(cycleId, userId, taskData) {
  const cycleRes = await query(
    `SELECT cc.id FROM crop_cycles cc JOIN farms f ON f.id = cc.farm_id WHERE cc.id = $1 AND f.user_id = $2`,
    [cycleId, userId]
  );
  if (cycleRes.rows.length === 0) {
    const error = new Error('Crop cycle not found.');
    error.statusCode = 404;
    error.code = 'CROP_CYCLE_NOT_FOUND';
    throw error;
  }

  const { title, description = null, scheduledDate = null, priority = 'MEDIUM', source = 'USER' } = taskData;
  const res = await query(
    `INSERT INTO crop_tasks (crop_cycle_id, title, description, scheduled_date, priority, status, source)
     VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
     RETURNING *`,
    [cycleId, title, description, scheduledDate, priority, source]
  );
  return res.rows[0];
}

export async function updateCycleTask(cycleId, taskId, userId, updateData) {
  const taskRes = await query(
    `SELECT ct.id 
     FROM crop_tasks ct
     JOIN crop_cycles cc ON cc.id = ct.crop_cycle_id
     JOIN farms f ON f.id = cc.farm_id
     WHERE ct.id = $1 AND cc.id = $2 AND f.user_id = $3`,
    [taskId, cycleId, userId]
  );

  if (taskRes.rows.length === 0) {
    const error = new Error('Task not found.');
    error.statusCode = 404;
    error.code = 'TASK_NOT_FOUND';
    throw error;
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (updateData.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(updateData.title);
  }
  if (updateData.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(updateData.description);
  }
  if (updateData.scheduledDate !== undefined) {
    fields.push(`scheduled_date = $${idx++}`);
    values.push(updateData.scheduledDate);
  }
  if (updateData.priority !== undefined) {
    fields.push(`priority = $${idx++}`);
    values.push(updateData.priority);
  }
  if (updateData.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(updateData.status);
  }

  values.push(taskId);
  const sql = `UPDATE crop_tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const res = await query(sql, values);
  return res.rows[0];
}

// Observations
export async function getCycleObservations(cycleId, userId) {
  const cycleRes = await query(
    `SELECT cc.id FROM crop_cycles cc JOIN farms f ON f.id = cc.farm_id WHERE cc.id = $1 AND f.user_id = $2`,
    [cycleId, userId]
  );
  if (cycleRes.rows.length === 0) {
    const error = new Error('Crop cycle not found.');
    error.statusCode = 404;
    throw error;
  }

  const res = await query(
    'SELECT * FROM farm_observations WHERE crop_cycle_id = $1 ORDER BY observation_date DESC, created_at DESC',
    [cycleId]
  );
  return res.rows;
}

export async function addCycleObservation(cycleId, userId, observationData) {
  const cycleRes = await query(
    `SELECT cc.id FROM crop_cycles cc JOIN farms f ON f.id = cc.farm_id WHERE cc.id = $1 AND f.user_id = $2`,
    [cycleId, userId]
  );
  if (cycleRes.rows.length === 0) {
    const error = new Error('Crop cycle not found.');
    error.statusCode = 404;
    throw error;
  }

  const { category, description, severity = 'LOW', observationDate = new Date().toISOString().split('T')[0] } = observationData;
  const res = await query(
    `INSERT INTO farm_observations (crop_cycle_id, category, description, severity, observation_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [cycleId, category, description, severity, observationDate]
  );
  return res.rows[0];
}

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
