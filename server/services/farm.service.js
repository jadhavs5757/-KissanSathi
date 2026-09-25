import { query } from '../config/database.js';

export async function getUserFarms(userId) {
  const sql = `
    SELECT f.*,
      (SELECT COUNT(*) FROM crop_cycles cc WHERE cc.farm_id = f.id AND cc.status = 'ACTIVE') AS active_cycles_count,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE e.farm_id = f.id) AS total_expenses
    FROM farms f
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
  `;
  const res = await query(sql, [userId]);
  return res.rows;
}

export async function getFarmById(farmId, userId) {
  const sql = `
    SELECT f.*,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE e.farm_id = f.id) AS total_expenses
    FROM farms f
    WHERE f.id = $1 AND f.user_id = $2
  `;
  const res = await query(sql, [farmId, userId]);
  if (res.rows.length === 0) {
    const error = new Error('Farm not found.');
    error.statusCode = 404;
    error.code = 'FARM_NOT_FOUND';
    throw error;
  }
  return res.rows[0];
}

export async function createFarm(userId, farmData) {
  const {
    name,
    location,
    land_area_acres,
    ownership,
    previous_crop,
    soil_source = 'UNKNOWN',
    soil_type,
    soil_ph,
    nitrogen,
    phosphorus,
    potassium,
    organic_carbon,
    water_source,
    pump_capacity_hp,
    water_hours_per_day,
    irrigation_method,
    rain_dependence_percent,
    capital_budget,
    labour_description,
    equipment_description,
    storage_available = false,
    electricity_available = false
  } = farmData;

  const sql = `
    INSERT INTO farms (
      user_id, name, location, land_area_acres, ownership, previous_crop,
      soil_source, soil_type, soil_ph, nitrogen, phosphorus, potassium, organic_carbon,
      water_source, pump_capacity_hp, water_hours_per_day, irrigation_method, rain_dependence_percent,
      capital_budget, labour_description, equipment_description, storage_available, electricity_available
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23
    )
    RETURNING *
  `;

  const values = [
    userId,
    name,
    location,
    land_area_acres,
    ownership,
    previous_crop || null,
    soil_source,
    soil_type || null,
    soil_ph || null,
    nitrogen || null,
    phosphorus || null,
    potassium || null,
    organic_carbon || null,
    water_source,
    pump_capacity_hp || null,
    water_hours_per_day || null,
    irrigation_method || null,
    rain_dependence_percent || null,
    capital_budget,
    labour_description || null,
    equipment_description || null,
    storage_available,
    electricity_available
  ];

  const res = await query(sql, values);
  return res.rows[0];
}

export async function updateFarm(farmId, userId, updateData) {
  // First ensure farm exists and belongs to user
  await getFarmById(farmId, userId);

  const allowedKeys = [
    'name', 'location', 'land_area_acres', 'ownership', 'previous_crop',
    'soil_source', 'soil_type', 'soil_ph', 'nitrogen', 'phosphorus', 'potassium', 'organic_carbon',
    'water_source', 'pump_capacity_hp', 'water_hours_per_day', 'irrigation_method', 'rain_dependence_percent',
    'capital_budget', 'labour_description', 'equipment_description', 'storage_available', 'electricity_available'
  ];

  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of allowedKeys) {
    if (updateData[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(updateData[key]);
    }
  }

  if (fields.length === 0) {
    return getFarmById(farmId, userId);
  }

  values.push(farmId);
  values.push(userId);

  const sql = `
    UPDATE farms 
    SET ${fields.join(', ')} 
    WHERE id = $${idx++} AND user_id = $${idx++}
    RETURNING *
  `;

  const res = await query(sql, values);
  return res.rows[0];
}

export async function deleteFarm(farmId, userId) {
  // Verify ownership
  await getFarmById(farmId, userId);

  const res = await query('DELETE FROM farms WHERE id = $1 AND user_id = $2 RETURNING id', [farmId, userId]);
  return { deleted: true, id: farmId };
}
