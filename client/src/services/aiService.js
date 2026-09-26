import supabase from '../config/supabase';

export const aiService = {
  /**
   * Invoke the Supabase ai-chat Edge Function with multi-turn grounding and Gemini.
   */
  async askAssistant(payload) {
    const selectedLanguage =
      payload.language ||
      payload.preferredLanguage ||
      (typeof window !== 'undefined' ? localStorage.getItem('kisansaarthi_lang') : null) ||
      'en';

    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: payload.message,
        conversationId: payload.conversationId || payload.cropCycleId || null,
        language: selectedLanguage,
        farmId: payload.farmId || null,
        cropCycleId: payload.cropCycleId || null
      }
    });

    if (error) {
      console.error('Supabase ai-chat error:', error);
      throw error;
    }

    if (!data?.success && data?.error) {
      throw new Error(data.error.message || 'AI chat failed');
    }

    return data?.data || data;
  },

  /**
   * Fetch auditable AI history from public.ai_histories.
   */
  async getHistory(params = {}) {
    let query = supabase
      .from('ai_histories')
      .select('*, farms(name), crop_cycles(crop_name)')
      .order('created_at', { ascending: false });

    if (params.featureType) {
      query = query.eq('feature_type', params.featureType);
    }
    if (params.farmId) {
      query = query.eq('farm_id', params.farmId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching AI history:', error);
      return { items: [] };
    }

    const items = (data || []).map((h) => ({
      ...h,
      farm_name: h.farms?.name || null,
      crop_name: h.crop_cycles?.crop_name || null
    }));

    return { items };
  },

  /**
   * Fetch single AI history item by ID.
   */
  async getHistoryItem(historyId) {
    const { data, error } = await supabase
      .from('ai_histories')
      .select('*, farms(name), crop_cycles(crop_name)')
      .eq('id', historyId)
      .single();

    if (error) {
      console.error('Error fetching AI history item:', error);
      return null;
    }

    return {
      ...data,
      farm_name: data.farms?.name || null,
      crop_name: data.crop_cycles?.crop_name || null
    };
  }
};

export { schemeService } from './schemeService';


