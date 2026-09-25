import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../app.js';
import { query } from '../config/database.js';

let server;
let baseUrl;

test.before(async () => {
  // Start test server on random port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
});

test.after(async () => {
  if (server) {
    server.close();
  }
});

test('Health check endpoint returns status ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'ok');
  assert.equal(json.service, 'kisansaarthi-api');
});

test('Authentication: Register User A and User B', async () => {
  const userAEmail = `farmer_a_${Date.now()}@example.com`;
  const resA = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Patel',
      email: userAEmail,
      password: 'password123',
      phone: '9876543210',
      preferred_language: 'en',
      location: 'Nashik, Maharashtra'
    })
  });

  assert.equal(resA.status, 201);
  const dataA = await resA.json();
  assert.equal(dataA.success, true);
  assert.ok(dataA.data.token);
  assert.equal(dataA.data.user.email, userAEmail.toLowerCase());
  const tokenA = dataA.data.token;

  // Duplicate registration should return 409
  const resDup = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Ramesh',
      email: userAEmail,
      password: 'password123'
    })
  });
  assert.equal(resDup.status, 409);

  // Register User B
  const userBEmail = `farmer_b_${Date.now()}@example.com`;
  const resB = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Suresh Kumar',
      email: userBEmail,
      password: 'password456',
      location: 'Pune, Maharashtra'
    })
  });
  assert.equal(resB.status, 201);
  const dataB = await resB.json();
  const tokenB = dataB.data.token;

  // Login test
  const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: 'password123'
    })
  });
  assert.equal(resLogin.status, 200);
  const dataLogin = await resLogin.json();
  assert.ok(dataLogin.data.token);

  // Create Farm for User A
  const resFarm = await fetch(`${baseUrl}/api/farms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      name: 'Green Valley Plot',
      location: 'Nashik, Maharashtra',
      land_area_acres: 2.5,
      ownership: 'OWN',
      previous_crop: 'Wheat',
      soil_source: 'SOIL_HEALTH_CARD',
      soil_type: 'Black Clay Loam',
      soil_ph: 7.2,
      nitrogen: 210,
      phosphorus: 24,
      potassium: 290,
      water_source: 'BOREWELL',
      pump_capacity_hp: 5,
      water_hours_per_day: 6,
      capital_budget: 85000,
      storage_available: true,
      electricity_available: true
    })
  });

  assert.equal(resFarm.status, 201);
  const dataFarm = await resFarm.json();
  const farmAId = dataFarm.data.farm.id;
  assert.ok(farmAId);

  // Data Isolation: User B CANNOT access User A's farm -> returns 404
  const resBViewA = await fetch(`${baseUrl}/api/farms/${farmAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.equal(resBViewA.status, 404);

  // AI Crop Recommendations for User A's farm
  const resAnalyze = await fetch(`${baseUrl}/api/farms/${farmAId}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      preferences: { lowerRisk: true }
    })
  });
  assert.equal(resAnalyze.status, 200);
  const dataAnalyze = await resAnalyze.json();
  assert.ok(dataAnalyze.data.recommendations.length > 0);
  assert.ok(dataAnalyze.data.aiHistoryId);
  const firstCrop = dataAnalyze.data.recommendations[0];
  assert.ok(firstCrop.cropName);
  assert.ok(firstCrop.investment.expected > 0);
  assert.ok(firstCrop.revenue.expected > 0);

  // Deterministic Business Plan calculation
  const resBiz = await fetch(`${baseUrl}/api/farms/${farmAId}/business-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      cropName: firstCrop.cropName,
      landAreaAcres: 2.5,
      durationDays: firstCrop.durationDays || 110,
      customBreakdown: {
        seeds: 8000,
        fertilizer: 15000,
        labour: 12000,
        irrigation: 4000,
        pestManagement: 6000,
        machinery: 5000,
        transport: 3000,
        other: 2000
      }
    })
  });
  assert.equal(resBiz.status, 201);
  const dataBiz = await resBiz.json();
  const bp = dataBiz.data.businessPlan;
  assert.equal(
    Number(bp.expected_net),
    Number(bp.expected_revenue) - Number(bp.expected_cost),
    'Net must equal revenue minus cost deterministically'
  );
  assert.equal(
    Number(bp.conservative_net),
    Number(bp.conservative_revenue) - Number(bp.conservative_cost)
  );

  // Start Crop Cycle
  const resCycle = await fetch(`${baseUrl}/api/farms/${farmAId}/crop-cycles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      cropName: firstCrop.cropName,
      variety: 'Improved Hybrid',
      areaAcres: 2.5,
      plantingDate: new Date().toISOString().split('T')[0],
      expectedDurationDays: 120,
      currentStage: 'PLANTING',
      status: 'ACTIVE'
    })
  });
  assert.equal(resCycle.status, 201);
  const dataCycle = await resCycle.json();
  const cycleId = dataCycle.data.cropCycle.id;
  assert.ok(cycleId);

  // Verify auto-generated milestone tasks
  const resTasks = await fetch(`${baseUrl}/api/crop-cycles/${cycleId}/tasks`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert.equal(resTasks.status, 200);
  const dataTasks = await resTasks.json();
  assert.ok(dataTasks.data.tasks.length >= 3);

  // Expense CRUD
  const resExp = await fetch(`${baseUrl}/api/farms/${farmAId}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      cropCycleId: cycleId,
      category: 'SEEDS',
      amount: 7500,
      expenseDate: new Date().toISOString().split('T')[0],
      description: 'Certified foundation hybrid seeds'
    })
  });
  assert.equal(resExp.status, 201);

  // Expense summary
  const resExpList = await fetch(`${baseUrl}/api/farms/${farmAId}/expenses`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert.equal(resExpList.status, 200);
  const expData = await resExpList.json();
  assert.equal(expData.data.totalAmount, 7500);
  assert.equal(expData.data.categoryTotals.SEEDS, 7500);

  // Government Schemes discovery
  const resSchemes = await fetch(`${baseUrl}/api/farms/${farmAId}/schemes`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert.equal(resSchemes.status, 200);
  const dataSchemes = await resSchemes.json();
  assert.ok(dataSchemes.data.schemes.length >= 5);

  // AI Assistant with farm context
  const resAi = await fetch(`${baseUrl}/api/ai/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      farmId: farmAId,
      cropCycleId: cycleId,
      message: 'What should I do today for my crop?'
    })
  });
  assert.equal(resAi.status, 200);
  const dataAi = await resAi.json();
  assert.ok(dataAi.data.answer);
  assert.ok(dataAi.data.actions.length > 0);

  // AI History isolation: User B cannot see User A's history
  const resHistB = await fetch(`${baseUrl}/api/ai/history`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.equal(resHistB.status, 200);
  const dataHistB = await resHistB.json();
  assert.equal(dataHistB.data.items.length, 0, 'User B must not see any AI history from User A');
});
