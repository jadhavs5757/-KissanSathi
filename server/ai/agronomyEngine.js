/**
 * Agronomy Intelligence Engine
 * Deterministic agro-climatic reasoning generator adhering strictly to KisanSaarthi AI schema contracts.
 */

export function generateAgronomicCropRecommendations(farm, preferences = {}) {
  const acres = Number(farm.land_area_acres) || 1;
  const budget = Number(farm.capital_budget) || 50000;
  const soil = (farm.soil_type || 'LOAMY').toUpperCase();
  const water = farm.water_source;
  const rainDep = Number(farm.rain_dependence_percent) || 50;

  const candidateCrops = [
    {
      name: 'Soybean (JS-335 / JS-9560)',
      suitability: rainDep > 60 || water === 'RAINFED' || water === 'BOREWELL' ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'MODERATE (450-500 mm)',
      costPerAcre: 18000,
      durationDays: 95,
      yieldRangePerAcre: [0.9, 1.2, 1.5], // tonnes
      pricePerTonne: 42000,
      risk: 'LOW',
      reasoning: `Well suited for ${soil} soil with ${water.toLowerCase()} irrigation. Good nitrogen fixation capacity and reliable local mandi demand.`,
      tradeoffs: ['Moderate margins compared to commercial horticultural crops', 'Sensitive to prolonged waterlogging during flowering'],
      assumptions: ['Standard monsoon or timely supplemental irrigation during pod filling', 'Certified seed quality with rhizobium inoculation']
    },
    {
      name: 'Chilli (Byadgi / Teja Variety)',
      suitability: budget >= 40000 * acres && (water === 'BOREWELL' || water === 'OPEN_WELL' || water === 'COMBINATION') ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'MODERATE TO HIGH (Drip recommended)',
      costPerAcre: 42000,
      durationDays: 130,
      yieldRangePerAcre: [1.8, 2.8, 3.8], // tonnes dry/green
      pricePerTonne: 120000,
      risk: 'MEDIUM',
      reasoning: `High-value commercial cash crop. Compatible with farm budget of ₹${budget.toLocaleString('en-IN')} and provides high returns on irrigated land.`,
      tradeoffs: ['Requires vigilant pest scouting for thrips and mites', 'Higher capital expenditure for initial transplanting and plant protection'],
      assumptions: ['Adequate water availability during flowering and fruiting', 'Access to prompt harvesting labor']
    },
    {
      name: 'Gram / Chickpea (Desi / Kabuli)',
      suitability: soil.includes('BLACK') || soil.includes('CLAY') || water === 'RAINFED' ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'LOW (250-300 mm)',
      costPerAcre: 14000,
      durationDays: 105,
      yieldRangePerAcre: [0.7, 1.0, 1.3],
      pricePerTonne: 55000,
      risk: 'LOW',
      reasoning: `Extremely water-efficient pulse crop that thrives on residual soil moisture. Ideal if water supply is limited or water hours are low.`,
      tradeoffs: ['Lower gross revenue ceiling compared to spices or vegetables', 'Susceptible to pod borer if monitoring is skipped'],
      assumptions: ['Minimum one protective irrigation at flowering stage', 'Good field drainage']
    },
    {
      name: 'Cotton (Bt Hybrid)',
      suitability: (soil.includes('BLACK') || soil.includes('LOAM')) && acres >= 1.5 ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'MEDIUM TO HIGH (650-750 mm)',
      costPerAcre: 28000,
      durationDays: 160,
      yieldRangePerAcre: [0.8, 1.4, 2.0],
      pricePerTonne: 70000,
      risk: 'MEDIUM',
      reasoning: `Established commercial cash crop suitable for the land size of ${acres} acres. Deep taproot system withstands short dry spells.`,
      tradeoffs: ['Longer gestation duration (160+ days)', 'Price volatility dependent on global and domestic textile demand'],
      assumptions: ['Timely pink bollworm management and balanced NPK fertilizer application']
    },
    {
      name: 'Tomato (Hybrid Saaho / Abhinav)',
      suitability: water !== 'RAINFED' && budget >= 35000 * acres ? 'MEDIUM' : 'LOW',
      waterRequirement: 'MODERATE (Regular watering schedule)',
      costPerAcre: 35000,
      durationDays: 115,
      yieldRangePerAcre: [12.0, 18.0, 24.0],
      pricePerTonne: 16000,
      risk: 'HIGH',
      reasoning: `High yielding short duration horticultural option. Can deliver fast cash flow within 115 days if market timing matches harvest.`,
      tradeoffs: ['High perishable commodity with sharp market price fluctuations', 'Demands frequent picking and careful transport'],
      assumptions: ['Staking and mulching adopted for maximum fruit quality', 'Proximity to rural assembly or district mandi']
    }
  ];

  // Select top 3-4 recommendations based on budget and priorities
  let filtered = candidateCrops.filter(c => c.costPerAcre * acres <= budget * 1.35);
  if (filtered.length < 2) {
    filtered = candidateCrops.slice(0, 3);
  } else {
    filtered = filtered.slice(0, 4);
  }

  const recommendations = filtered.map(c => {
    const minInv = Math.round(c.costPerAcre * acres * 0.9);
    const expInv = Math.round(c.costPerAcre * acres);
    const maxInv = Math.round(c.costPerAcre * acres * 1.15);

    const minYld = Number((c.yieldRangePerAcre[0] * acres).toFixed(2));
    const expYld = Number((c.yieldRangePerAcre[1] * acres).toFixed(2));
    const maxYld = Number((c.yieldRangePerAcre[2] * acres).toFixed(2));

    const minRev = Math.round(minYld * c.pricePerTonne * 0.85);
    const expRev = Math.round(expYld * c.pricePerTonne);
    const maxRev = Math.round(maxYld * c.pricePerTonne * 1.2);

    return {
      cropName: c.name,
      suitability: c.suitability,
      waterRequirement: c.waterRequirement,
      investment: {
        min: minInv,
        expected: expInv,
        max: maxInv
      },
      durationDays: c.durationDays,
      yield: {
        min: minYld,
        expected: expYld,
        max: maxYld,
        unit: 'tonnes'
      },
      revenue: {
        min: minRev,
        expected: expRev,
        max: maxRev,
        currency: 'INR'
      },
      risk: c.risk,
      reasoning: c.reasoning,
      tradeoffs: c.tradeoffs,
      assumptions: c.assumptions,
      confidence: c.suitability === 'HIGH' ? 84 : 72
    };
  });

  const missingInfo = [];
  if (!farm.soil_ph) missingInfo.push('Soil pH test value not provided; assumed neutral range (6.5 - 7.5).');
  if (!farm.nitrogen) missingInfo.push('Soil NPK test values missing; baseline regional fertility assumed.');
  if (!farm.water_hours_per_day) missingInfo.push('Water pumping hours/day unspecified; average operational availability assumed.');

  return {
    recommendations,
    missingInformation: missingInfo,
    generalAssumptions: [
      'Projections are planning estimates based on standard agro-climatic benchmarks and do not guarantee market prices or weather.',
      'Gross revenue assumes selling at prevailing modal prices in nearby APMC mandi.',
      'Cost estimates include certified seeds, basic soil preparation, crop protection, and customary labor.'
    ]
  };
}

export function generateAgronomicWeatherAction(weather, cropCycle) {
  const isRain = (weather?.precipitationProbability > 40) || (weather?.condition && weather.condition.toLowerCase().includes('rain'));
  const temp = weather?.temperature || 28;
  const stage = cropCycle?.current_stage || 'VEGETATIVE';
  const crop = cropCycle?.crop_name || 'Current crop';

  const actions = [];
  let riskLevel = 'LOW';
  let summary = `Weather conditions are moderate for ${crop} in ${stage} stage.`;

  if (isRain) {
    riskLevel = 'MEDIUM';
    summary = `Rainfall predicted in the upcoming forecast. Drainage and fungal risk assessment required for ${crop}.`;
    actions.push({
      priority: 'HIGH',
      action: 'Postpone scheduled irrigation and foliar chemical sprays.',
      reason: 'Sufficient ambient soil moisture expected; rain wash will waste chemical sprays and risk root suffocation.'
    });
    actions.push({
      priority: 'MEDIUM',
      action: 'Clear field drainage furrows to prevent waterlogging around roots.',
      reason: 'Standing water reduces soil aeration and triggers root rot pathogens.'
    });
  } else if (temp > 35) {
    riskLevel = 'MEDIUM';
    summary = `High temperatures (${temp}°C) forecast. Moisture stress prevention is critical.`;
    actions.push({
      priority: 'HIGH',
      action: 'Schedule irrigation during early morning or late evening hours.',
      reason: 'Minimizes evaporative loss and protects root temperature during peak midday heat.'
    });
    actions.push({
      priority: 'LOW',
      action: 'Check for leaf curling or wilting symptoms in the afternoon.',
      reason: 'Early indicator of transpiration stress.'
    });
  } else {
    actions.push({
      priority: 'MEDIUM',
      action: 'Proceed with routine intercultural weeding and balanced nutrition application.',
      reason: 'Stable weather conditions support active vegetative uptake without immediate climate risks.'
    });
    actions.push({
      priority: 'LOW',
      action: 'Inspect lower leaf surfaces for early pest colonies.',
      reason: 'Preventive scouting during clear weather avoids sudden pest flare-ups.'
    });
  }

  return {
    summary,
    riskLevel,
    actions,
    uncertainties: ['Micro-climate variations at field level may differ slightly from gridded meteorological forecasts.'],
    confidence: 82
  };
}

export function generateAgronomicCropAdvisory(cropCycle, farm) {
  const stage = cropCycle?.current_stage || 'VEGETATIVE';
  const crop = cropCycle?.crop_name || 'Crop';
  const plantingDate = cropCycle?.planting_date;
  const daysPassed = plantingDate 
    ? Math.max(1, Math.floor((new Date() - new Date(plantingDate)) / (1000 * 60 * 60 * 24)))
    : 30;

  const stageAdvisories = {
    PLANTING: {
      action: 'Ensure uniform seed spacing and soil depth with adequate seed treatment.',
      reason: 'Protects emerging germlings against soil-borne damping-off fungi.'
    },
    GERMINATION: {
      action: 'Check plant stand percentage and carry out gap-filling within 7-10 days.',
      reason: 'Maintains optimal plant population per acre for target yield.'
    },
    EARLY_GROWTH: {
      action: 'Conduct first light hoeing or weeding and verify root establishment.',
      reason: 'Removes weed competition for critical soil moisture and nutrients.'
    },
    VEGETATIVE: {
      action: 'Apply split dose of nitrogen/potash as per crop schedule and inspect for sucking pests.',
      reason: 'Supports vigorous stem elongation and leaf surface expansion.'
    },
    FLOWERING: {
      action: 'Maintain consistent soil moisture and avoid water deficit stress.',
      reason: 'Moisture stress during blooming causes flower drop and poor pod/fruit set.'
    },
    FRUITING: {
      action: 'Monitor for fruit and pod borers; support fruit weight if trellising is needed.',
      reason: 'Direct damage to fruit or pods directly reduces marketable grade and weight.'
    },
    MATURATION: {
      action: 'Gradually terminate irrigation 10-14 days prior to target harvest date.',
      reason: 'Facilitates uniform drying and prevents secondary vegetative flushing.'
    },
    HARVEST: {
      action: 'Harvest during dry hours and transport to clean, shaded holding area.',
      reason: 'Prevents post-harvest mold and maintains commodity market grade.'
    }
  };

  const currentAdv = stageAdvisories[stage] || stageAdvisories.VEGETATIVE;

  return {
    summary: `${crop} is currently at day ${daysPassed} (${stage} stage). Focused crop-management is recommended to preserve yield potential.`,
    currentStage: stage,
    actions: [
      {
        priority: 'HIGH',
        action: currentAdv.action,
        reason: currentAdv.reason
      },
      {
        priority: 'MEDIUM',
        action: 'Log all incurred input costs (fertilizer, labor) in the expense tracker.',
        reason: 'Maintains live tracking of actual investment against planned budget.'
      }
    ],
    risks: [
      'Unseasonal climatic fluctuations during this growth stage',
      'Pest emergence if field boundary sanitation is neglected'
    ],
    missingInformation: [],
    confidence: 86
  };
}

export function generateAgronomicAssistantResponse(message, farm, cropCycle, expensesTotal = 0) {
  const msg = message.toLowerCase();
  let answer = '';
  const actions = [];
  const assumptions = [];
  const missingInfo = [];

  const farmName = farm?.name || 'your farm';
  const cropName = cropCycle?.crop_name || 'your current crop';
  const stage = cropCycle?.current_stage || 'current stage';

  if (msg.includes('today') || msg.includes('what should i do')) {
    answer = `For ${farmName}, with ${cropName} in the ${stage} stage: your immediate focus should be inspecting field moisture and checking for any leaf spots or insect activity. Total expenses logged so far stand at ₹${expensesTotal.toLocaleString('en-IN')}.`;
    actions.push({
      priority: 'HIGH',
      action: 'Inspect field moisture level at root depth (4-6 inches).',
      reason: 'Avoid both water deficit stress and over-saturation.'
    });
    actions.push({
      priority: 'MEDIUM',
      action: 'Complete pending routine tasks in your Crop Control Center.',
      reason: 'Keeps field operations aligned with the crop calendar.'
    });
  } else if (msg.includes('spent') || msg.includes('expense') || msg.includes('cost') || msg.includes('money')) {
    answer = `Based on your recorded accounts, total expenses for ${farmName} amount to ₹${expensesTotal.toLocaleString('en-IN')}. Farm capital budget was planned at ₹${(Number(farm?.capital_budget) || 0).toLocaleString('en-IN')}.`;
    actions.push({
      priority: 'MEDIUM',
      action: 'Review category breakdowns (Seeds, Fertilizer, Labour, Irrigation) in the Expenses tab.',
      reason: 'Identifies where capital is being deployed most heavily.'
    });
  } else if (msg.includes('water') || msg.includes('irrigation') || msg.includes('borewell')) {
    const waterSource = farm?.water_source || 'your water source';
    const hours = farm?.water_hours_per_day ? `${farm.water_hours_per_day} hours/day` : 'flexible schedule';
    answer = `Your farm is configured with ${waterSource} irrigation running approximately ${hours}. In ${stage} stage, regulate irrigation to match soil absorption without creating standing pools.`;
    actions.push({
      priority: 'HIGH',
      action: 'Maintain irrigation during morning or evening hours.',
      reason: 'Reduces evaporation loss and prevents fungal spore development on wet foliage during hot afternoons.'
    });
  } else if (msg.includes('scheme') || msg.includes('government') || msg.includes('subsidy')) {
    answer = `Key potentially relevant programs for your farm profile include PMFBY (Crop Insurance for ${cropName}), PM-KISAN (₹6,000/yr income support), PMKSY (Micro-irrigation subsidy up to 55%), and Kisan Credit Card (concessional crop loans at 4%). Check the Government Support tab for exact documentation checklists.`;
    actions.push({
      priority: 'MEDIUM',
      action: 'Verify your Aadhaar e-KYC and land ownership 7/12 extract / Patta papers.',
      reason: 'Essential document requirement across all state and central agricultural subsidy applications.'
    });
  } else if (msg.includes('rain') || msg.includes('weather') || msg.includes('storm')) {
    answer = `When rainfall is forecast or increases, the primary directive is to immediately pause automated irrigation, verify soil moisture absorption, and inspect perimeter drainage channels to eliminate standing pools.`;
    actions.push({
      priority: 'HIGH',
      action: 'Halt additional irrigation and delay pesticide spraying until dry weather.',
      reason: 'Rain wash neutralizes chemical treatments and standing water damages root aeration.'
    });
  } else {
    answer = `Based on your digital farm profile (${farm?.land_area_acres || 1} acres, ${farm?.soil_type || 'soil'}, ${farm?.water_source || 'water'}), manage ${cropName} with balanced nutrient application and regular scouting. Log any new observations or costs to keep your farm data up to date.`;
    actions.push({
      priority: 'MEDIUM',
      action: 'Review your upcoming crop tasks and record any physical observations in the crop control center.',
      reason: 'Maintains an auditable farm history for decision support.'
    });
  }

  assumptions.push('Estimates are planning indicators and must be balanced with direct field observation.');

  return {
    answer,
    actions,
    assumptions,
    missingInformation: missingInfo,
    confidence: 85
  };
}
