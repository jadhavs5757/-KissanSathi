import supabase from '../config/supabase';
import api from './api';

export const farmService = {
  /**
   * Fetch all farms belonging to the authenticated user from Supabase.
   * Leverages Supabase RLS (auth.uid() = user_id).
   */
  async getFarms() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*, crop_cycles(id, status), expenses(amount)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((farm) => {
        const activeCycles = Array.isArray(farm.crop_cycles)
          ? farm.crop_cycles.filter((c) => c.status === 'ACTIVE').length
          : 0;
        const totalExpenses = Array.isArray(farm.expenses)
          ? farm.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
          : 0;

        return {
          ...farm,
          active_cycles_count: activeCycles,
          total_expenses: totalExpenses
        };
      });
    } catch (nestedErr) {
      // Fallback to simple select if relational join is unavailable
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getFarms error:', error);
        throw new Error(error.message || 'Failed to load farms from Supabase.');
      }

      return (data || []).map((farm) => ({
        ...farm,
        active_cycles_count: 0,
        total_expenses: 0
      }));
    }
  },

  /**
   * Fetch a single farm by ID from Supabase for the authenticated user.
   */
  async getFarm(farmId) {
    if (!farmId) throw new Error('Farm ID is required.');

    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*, expenses(amount)')
        .eq('id', farmId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Farm not found.');

      const totalExpenses = Array.isArray(data.expenses)
        ? data.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        : 0;

      return {
        ...data,
        total_expenses: totalExpenses
      };
    } catch (nestedErr) {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .single();

      if (error) {
        console.error('Supabase getFarm error:', error);
        throw new Error(error.message || 'Farm not found.');
      }

      return {
        ...data,
        total_expenses: 0
      };
    }
  },

  /**
   * Create a new farm record in Supabase public.farms.
   * Attaches the authenticated user ID and strictly formats schema fields.
   */
  async createFarm(farmData) {
    let { data: { session } } = await supabase.auth.getSession();
    let user = session?.user;

    if (!user) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('You must be signed in to create a farm.');
      }
      user = userData.user;
    }

    const payload = {
      user_id: user.id,
      name: farmData.name ? String(farmData.name).trim() : 'Unnamed Farm',
      location: farmData.location ? String(farmData.location).trim() : 'Unspecified',
      land_area_acres: Number(farmData.land_area_acres) || 1,
      ownership: ['OWN', 'LEASE'].includes(farmData.ownership) ? farmData.ownership : 'OWN',
      previous_crop: farmData.previous_crop ? String(farmData.previous_crop).trim() : null,
      soil_source: ['SOIL_HEALTH_CARD', 'LAB_TEST', 'USER_ENTERED', 'UNKNOWN'].includes(farmData.soil_source)
        ? farmData.soil_source
        : 'UNKNOWN',
      soil_type: farmData.soil_type ? String(farmData.soil_type).trim() : null,
      soil_ph: farmData.soil_ph != null && farmData.soil_ph !== '' ? Number(farmData.soil_ph) : null,
      nitrogen: farmData.nitrogen != null && farmData.nitrogen !== '' ? Number(farmData.nitrogen) : null,
      phosphorus: farmData.phosphorus != null && farmData.phosphorus !== '' ? Number(farmData.phosphorus) : null,
      potassium: farmData.potassium != null && farmData.potassium !== '' ? Number(farmData.potassium) : null,
      organic_carbon: farmData.organic_carbon != null && farmData.organic_carbon !== '' ? Number(farmData.organic_carbon) : null,
      water_source: ['BOREWELL', 'OPEN_WELL', 'CANAL', 'RIVER', 'TANK', 'RAINFED', 'COMBINATION'].includes(farmData.water_source)
        ? farmData.water_source
        : 'BOREWELL',
      pump_capacity_hp: farmData.pump_capacity_hp != null && farmData.pump_capacity_hp !== '' ? Number(farmData.pump_capacity_hp) : null,
      water_hours_per_day: farmData.water_hours_per_day != null && farmData.water_hours_per_day !== '' ? Number(farmData.water_hours_per_day) : null,
      irrigation_method: farmData.irrigation_method ? String(farmData.irrigation_method).trim() : null,
      rain_dependence_percent: farmData.rain_dependence_percent != null && farmData.rain_dependence_percent !== '' ? Number(farmData.rain_dependence_percent) : null,
      capital_budget: farmData.capital_budget != null && farmData.capital_budget !== '' ? Number(farmData.capital_budget) : 0,
      labour_description: farmData.labour_description ? String(farmData.labour_description).trim() : null,
      equipment_description: farmData.equipment_description ? String(farmData.equipment_description).trim() : null,
      storage_available: Boolean(farmData.storage_available),
      electricity_available: Boolean(farmData.electricity_available)
    };

    const { data, error } = await supabase
      .from('farms')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Supabase createFarm error:', error);
      throw new Error(error.message || 'Failed to save farm profile to Supabase.');
    }

    return data;
  },

  /**
   * Update an existing farm record in Supabase public.farms.
   */
  async updateFarm(farmId, farmData) {
    if (!farmId) throw new Error('Farm ID is required.');

    const allowedKeys = [
      'name', 'location', 'land_area_acres', 'ownership', 'previous_crop',
      'soil_source', 'soil_type', 'soil_ph', 'nitrogen', 'phosphorus', 'potassium', 'organic_carbon',
      'water_source', 'pump_capacity_hp', 'water_hours_per_day', 'irrigation_method', 'rain_dependence_percent',
      'capital_budget', 'labour_description', 'equipment_description', 'storage_available', 'electricity_available'
    ];

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    for (const key of allowedKeys) {
      if (farmData[key] !== undefined) {
        if (['land_area_acres', 'capital_budget'].includes(key)) {
          updatePayload[key] = Number(farmData[key]);
        } else if (['soil_ph', 'nitrogen', 'phosphorus', 'potassium', 'organic_carbon', 'pump_capacity_hp', 'water_hours_per_day', 'rain_dependence_percent'].includes(key)) {
          updatePayload[key] = farmData[key] != null && farmData[key] !== '' ? Number(farmData[key]) : null;
        } else if (['storage_available', 'electricity_available'].includes(key)) {
          updatePayload[key] = Boolean(farmData[key]);
        } else if (typeof farmData[key] === 'string') {
          updatePayload[key] = farmData[key].trim();
        } else {
          updatePayload[key] = farmData[key];
        }
      }
    }

    const { data, error } = await supabase
      .from('farms')
      .update(updatePayload)
      .eq('id', farmId)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateFarm error:', error);
      throw new Error(error.message || 'Failed to update farm.');
    }

    return data;
  },

  /**
   * Delete a farm record in Supabase public.farms.
   */
  async deleteFarm(farmId) {
    if (!farmId) throw new Error('Farm ID is required.');

    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', farmId);

    if (error) {
      console.error('Supabase deleteFarm error:', error);
      throw new Error(error.message || 'Failed to delete farm.');
    }

    return { success: true, deleted: true, id: farmId };
  },

  /**
   * Weather & Schemes queries remain on existing Express backend during this phase.
   */
  async getWeather(farmId) {
    const res = await api.get(`/farms/${farmId}/weather`);
    return res.data?.weather;
  },

  async getWeatherAction(farmId) {
    const res = await api.post(`/farms/${farmId}/weather-action`);
    return res.data?.weatherAction;
  },

  async getSchemes(farmId) {
    const res = await api.get(`/farms/${farmId}/schemes`);
    return res.data?.schemes || [];
  }
};
