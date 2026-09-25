import { query } from '../config/database.js';
import { getFarmById } from './farm.service.js';

export async function calculateAndCreateBusinessPlan(farmId, userId, planData) {
  // 1. Verify farm ownership
  const farm = await getFarmById(farmId, userId);

  const {
    cropPlanId = null,
    cropName,
    landAreaAcres,
    durationDays,
    customBreakdown = {}
  } = planData;

  const acres = Number(landAreaAcres) || Number(farm.land_area_acres) || 1;
  const days = Number(durationDays) || 120;

  // If cropPlanId is provided, pull baseline estimates from crop_plans
  let baselineExpectedCost = 30000 * acres;
  let baselineExpectedRevenue = 60000 * acres;

  if (cropPlanId) {
    const cpRes = await query(
      'SELECT investment_expected, investment_min, investment_max, revenue_expected, revenue_min, revenue_max FROM crop_plans WHERE id = $1 AND farm_id = $2',
      [cropPlanId, farmId]
    );
    if (cpRes.rows.length > 0) {
      const cp = cpRes.rows[0];
      baselineExpectedCost = Number(cp.investment_expected) || baselineExpectedCost;
      baselineExpectedRevenue = Number(cp.revenue_expected) || baselineExpectedRevenue;
    }
  }

  // Cost component baseline ratios
  const baseCost = baselineExpectedCost;
  const breakdown = {
    seeds: Math.round(customBreakdown.seeds !== undefined ? customBreakdown.seeds : baseCost * 0.15),
    fertilizer: Math.round(customBreakdown.fertilizer !== undefined ? customBreakdown.fertilizer : baseCost * 0.25),
    labour: Math.round(customBreakdown.labour !== undefined ? customBreakdown.labour : baseCost * 0.22),
    irrigation: Math.round(customBreakdown.irrigation !== undefined ? customBreakdown.irrigation : baseCost * 0.10),
    pestManagement: Math.round(customBreakdown.pestManagement !== undefined ? customBreakdown.pestManagement : baseCost * 0.12),
    machinery: Math.round(customBreakdown.machinery !== undefined ? customBreakdown.machinery : baseCost * 0.08),
    transport: Math.round(customBreakdown.transport !== undefined ? customBreakdown.transport : baseCost * 0.05),
    other: Math.round(customBreakdown.other !== undefined ? customBreakdown.other : baseCost * 0.03)
  };

  // Deterministic calculation of total expected cost from breakdown components
  const calculatedExpectedCost = Object.values(breakdown).reduce((acc, val) => acc + Number(val || 0), 0);

  // Deterministic scenario modeling
  // Conservative: Higher costs (+15%), Lower market realizations (-20%)
  const conservativeCost = Math.round(calculatedExpectedCost * 1.15);
  const conservativeRevenue = Math.round(baselineExpectedRevenue * 0.80);
  const conservativeNet = conservativeRevenue - conservativeCost;

  // Expected: Baseline values
  const expectedCost = calculatedExpectedCost;
  const expectedRevenue = Math.round(baselineExpectedRevenue);
  const expectedNet = expectedRevenue - expectedCost;

  // Favorable: Optimized cost efficiency (-10%), High market price / bumper yield (+25%)
  const favorableCost = Math.round(calculatedExpectedCost * 0.90);
  const favorableRevenue = Math.round(baselineExpectedRevenue * 1.25);
  const favorableNet = favorableRevenue - favorableCost;

  // Explicit assumptions list
  const assumptions = [
    `Land area basis: ${acres} acres with projected crop duration of ${days} days.`,
    'Calculations are deterministic financial estimates based on prevailing market input prices.',
    'Conservative scenario factors in a 20% drop in mandi realization and 15% input price rise.',
    'Expected scenario assumes standard yields and average regional mandi modal prices.',
    'Favorable scenario models favorable weather, optimal harvest grade, and strong seasonal price demand.',
    'Net returns are calculated deterministically as Net = Revenue - Total Cost.'
  ];

  // Store in PostgreSQL business_plans table
  const insertRes = await query(
    `INSERT INTO business_plans (
      farm_id, crop_plan_id, crop_name, land_area_acres, duration_days,
      conservative_cost, conservative_revenue, conservative_net,
      expected_cost, expected_revenue, expected_net,
      favorable_cost, favorable_revenue, favorable_net,
      cost_breakdown, assumptions
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb)
    RETURNING *`,
    [
      farmId,
      cropPlanId,
      cropName,
      acres,
      days,
      conservativeCost,
      conservativeRevenue,
      conservativeNet,
      expectedCost,
      expectedRevenue,
      expectedNet,
      favorableCost,
      favorableRevenue,
      favorableNet,
      JSON.stringify(breakdown),
      JSON.stringify(assumptions)
    ]
  );

  return insertRes.rows[0];
}

export async function getFarmBusinessPlans(farmId, userId) {
  await getFarmById(farmId, userId);

  const res = await query(
    `SELECT bp.*, cp.suitability, cp.risk
     FROM business_plans bp
     LEFT JOIN crop_plans cp ON cp.id = bp.crop_plan_id
     WHERE bp.farm_id = $1
     ORDER BY bp.created_at DESC`,
    [farmId]
  );
  return res.rows;
}

export async function getBusinessPlanById(farmId, planId, userId) {
  await getFarmById(farmId, userId);

  const res = await query(
    `SELECT bp.*, cp.suitability, cp.risk, cp.reasoning AS crop_reasoning
     FROM business_plans bp
     LEFT JOIN crop_plans cp ON cp.id = bp.crop_plan_id
     WHERE bp.id = $1 AND bp.farm_id = $2`,
    [planId, farmId]
  );

  if (res.rows.length === 0) {
    const error = new Error('Business plan not found.');
    error.statusCode = 404;
    error.code = 'BUSINESS_PLAN_NOT_FOUND';
    throw error;
  }
  return res.rows[0];
}
