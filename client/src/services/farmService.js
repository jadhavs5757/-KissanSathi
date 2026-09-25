import api from './api';

export const farmService = {
  async getFarms() {
    const res = await api.get('/farms');
    return res.data?.farms || [];
  },

  async getFarm(farmId) {
    const res = await api.get(`/farms/${farmId}`);
    return res.data?.farm;
  },

  async createFarm(farmData) {
    const res = await api.post('/farms', farmData);
    return res.data?.farm;
  },

  async updateFarm(farmId, farmData) {
    const res = await api.patch(`/farms/${farmId}`, farmData);
    return res.data?.farm;
  },

  async deleteFarm(farmId) {
    const res = await api.delete(`/farms/${farmId}`);
    return res.data;
  },

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
