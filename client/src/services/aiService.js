import api from './api';

export const aiService = {
  async askAssistant(payload) {
    const res = await api.post('/ai/assistant', payload);
    return res.data;
  },

  async getHistory(params = {}) {
    const res = await api.get('/ai/history', { params });
    return res.data;
  },

  async getHistoryItem(historyId) {
    const res = await api.get(`/ai/history/${historyId}`);
    return res.data?.record;
  }
};

export const schemeService = {
  async getAllSchemes() {
    const res = await api.get('/schemes');
    return res.data?.schemes || [];
  }
};
