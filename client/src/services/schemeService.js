import supabase from '../config/supabase';

/**
 * Annotates each government scheme with tailored relevance reasoning
 * based on the farm's acreage, water source, and land ownership.
 */
function annotateSchemeForFarm(s, farm) {
  const acres = Number(farm?.land_area_acres) || 1;
  const water = farm?.water_source;
  const ownership = farm?.ownership;

  let relevanceTier = 'POTENTIALLY_RELEVANT';
  let whyRelevant = '';

  const name = s.name || '';
  if (name.includes('PM-KISAN')) {
    if (ownership === 'OWN') {
      whyRelevant = `Direct income assistance of ₹6,000/yr for landholding farmers. Your profile indicates ${acres} acres owned land.`;
      relevanceTier = 'HIGHLY_RELEVANT';
    } else {
      whyRelevant = `Income support requires clear land title in applicant's name. Check current state guidelines for leased landholders.`;
      relevanceTier = 'CHECK_ELIGIBILITY';
    }
  } else if (name.includes('PMFBY')) {
    whyRelevant = `Comprehensive crop insurance to safeguard investment against unseasonal weather. Applicable for both owned and leased land.`;
    relevanceTier = 'HIGHLY_RELEVANT';
  } else if (name.includes('PMKSY')) {
    if (['BOREWELL', 'OPEN_WELL', 'CANAL', 'COMBINATION'].includes(water)) {
      whyRelevant = `Drip & sprinkler subsidies up to 55% for small/marginal farmers with an existing water source (${water ? water.toLowerCase() : ''}).`;
      relevanceTier = 'HIGHLY_RELEVANT';
    } else {
      whyRelevant = `Micro-irrigation subsidy requires an assured water intake point. May qualify if borewell or tank is being established.`;
      relevanceTier = 'CHECK_ELIGIBILITY';
    }
  } else if (name.includes('Kisan Credit Card')) {
    whyRelevant = `Subsidized working capital credit at 4% interest rate to finance seasonal input purchases for ${acres} acres.`;
    relevanceTier = 'HIGHLY_RELEVANT';
  } else if (name.includes('SMAM')) {
    whyRelevant = `Farm machinery & equipment subsidy (40% - 50%) for tractors, tillers, and sprayers.`;
    relevanceTier = 'POTENTIALLY_RELEVANT';
  } else if (name.includes('PKVY')) {
    whyRelevant = `Financial assistance (₹50,000/ha) if planning to transition toward certified natural or organic farming.`;
    relevanceTier = 'POTENTIALLY_RELEVANT';
  } else {
    whyRelevant = `Government agricultural assistance program. Review eligibility details and verify with local block office.`;
    relevanceTier = 'CHECK_ELIGIBILITY';
  }

  return {
    ...s,
    eligibility_summary: s.eligibility_summary || s.eligibility || '',
    official_source_url: s.official_source_url || s.application_link || '',
    relevanceTier,
    whyRelevant,
    required_documents: Array.isArray(s.required_documents)
      ? s.required_documents
      : (typeof s.required_documents === 'string'
        ? (() => { try { return JSON.parse(s.required_documents); } catch { return []; } })()
        : []),
    disclaimer: 'Eligibility is not guaranteed. Final sanction depends on verified land records, Aadhaar e-KYC, and state quota availability.'
  };
}

export const schemeService = {
  /**
   * Fetch all verified government schemes directly from Supabase public.government_schemes.
   */
  async getAllSchemes() {
    const { data, error } = await supabase
      .from('government_schemes')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching government schemes:', error);
      throw new Error(error.message || 'Failed to fetch government schemes');
    }

    return (data || []).map((s) => ({
      ...s,
      eligibility_summary: s.eligibility_summary || s.eligibility || '',
      official_source_url: s.official_source_url || s.application_link || '',
      required_documents: Array.isArray(s.required_documents)
        ? s.required_documents
        : (typeof s.required_documents === 'string'
          ? (() => { try { return JSON.parse(s.required_documents); } catch { return []; } })()
          : [])
    }));
  },

  /**
   * Fetch government schemes matched and annotated for a specific farm.
   */
  async getSchemes(farmId, farm = null) {
    let farmInfo = farm;
    if (!farmInfo && farmId) {
      try {
        const { data: fetchedFarm } = await supabase
          .from('farms')
          .select('*')
          .eq('id', farmId)
          .maybeSingle();
        farmInfo = fetchedFarm;
      } catch (err) {
        console.warn('Could not fetch farm profile for schemes reasoning:', err);
      }
    }

    const { data, error } = await supabase
      .from('government_schemes')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching government schemes from Supabase:', error);
      throw new Error(error.message || 'Failed to fetch government schemes');
    }

    return (data || []).map((s) => annotateSchemeForFarm(s, farmInfo));
  }
};

export default schemeService;
