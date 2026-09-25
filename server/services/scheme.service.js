import { query } from '../config/database.js';
import { getFarmById } from './farm.service.js';

export async function getAllSchemes() {
  const res = await query('SELECT * FROM scheme_records ORDER BY verification_status DESC, name ASC');
  return res.rows;
}

export async function getFarmSchemes(farmId, userId) {
  const farm = await getFarmById(farmId, userId);
  const schemesRes = await query('SELECT * FROM scheme_records ORDER BY name ASC');
  const schemes = schemesRes.rows;

  const acres = Number(farm.land_area_acres) || 1;
  const water = farm.water_source;
  const ownership = farm.ownership;

  // Annotate each scheme with transparent relevance reasoning
  return schemes.map((s) => {
    let relevanceTier = 'POTENTIALLY_RELEVANT';
    let whyRelevant = '';

    if (s.name.includes('PM-KISAN')) {
      if (ownership === 'OWN') {
        whyRelevant = `Direct income assistance of ₹6,000/yr for landholding farmers. Your profile indicates ${acres} acres owned land.`;
        relevanceTier = 'HIGHLY_RELEVANT';
      } else {
        whyRelevant = `Income support requires clear land title in applicant's name. Check current state guidelines for leased landholders.`;
        relevanceTier = 'CHECK_ELIGIBILITY';
      }
    } else if (s.name.includes('PMFBY')) {
      whyRelevant = `Comprehensive crop insurance to safeguard investment against unseasonal weather. Applicable for both owned and leased land.`;
      relevanceTier = 'HIGHLY_RELEVANT';
    } else if (s.name.includes('PMKSY')) {
      if (['BOREWELL', 'OPEN_WELL', 'CANAL', 'COMBINATION'].includes(water)) {
        whyRelevant = `Drip & sprinkler subsidies up to 55% for small/marginal farmers with an existing water source (${water.toLowerCase()}).`;
        relevanceTier = 'HIGHLY_RELEVANT';
      } else {
        whyRelevant = `Micro-irrigation subsidy requires an assured water intake point. May qualify if borewell or tank is being established.`;
        relevanceTier = 'CHECK_ELIGIBILITY';
      }
    } else if (s.name.includes('Kisan Credit Card')) {
      whyRelevant = `Subsidized working capital credit at 4% interest rate to finance seasonal input purchases for ${acres} acres.`;
      relevanceTier = 'HIGHLY_RELEVANT';
    } else if (s.name.includes('SMAM')) {
      whyRelevant = `Farm machinery & equipment subsidy (40% - 50%) for tractors, tillers, and sprayers.`;
      relevanceTier = 'POTENTIALLY_RELEVANT';
    } else if (s.name.includes('PKVY')) {
      whyRelevant = `Financial assistance (₹50,000/ha) if planning to transition toward certified natural or organic farming.`;
      relevanceTier = 'POTENTIALLY_RELEVANT';
    } else {
      whyRelevant = `Government agricultural assistance program. Review eligibility details and verify with local block office.`;
      relevanceTier = 'CHECK_ELIGIBILITY';
    }

    return {
      ...s,
      relevanceTier,
      whyRelevant,
      required_documents: typeof s.required_documents === 'string' ? JSON.parse(s.required_documents) : s.required_documents,
      disclaimer: 'Eligibility is not guaranteed. Final sanction depends on verified land records, Aadhaar e-KYC, and state quota availability.'
    };
  });
}
