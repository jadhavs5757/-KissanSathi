import api from './api';

export const cropService = {
  async analyzeFarm(farmId, preferences = {}) {
    const res = await api.post(`/farms/${farmId}/analyze`, { preferences });
    return res.data;
  },

  async getCropPlans(farmId) {
    const res = await api.get(`/farms/${farmId}/crop-plans`);
    return res.data?.cropPlans || [];
  },

  async getCropPlan(farmId, planId) {
    const res = await api.get(`/farms/${farmId}/crop-plans/${planId}`);
    return res.data?.cropPlan;
  },

  async createBusinessPlan(farmId, planData) {
    const res = await api.post(`/farms/${farmId}/business-plans`, planData);
    return res.data?.businessPlan;
  },

  async getBusinessPlans(farmId) {
    const res = await api.get(`/farms/${farmId}/business-plans`);
    return res.data?.businessPlans || [];
  },

  async getBusinessPlan(farmId, planId) {
    const res = await api.get(`/farms/${farmId}/business-plans/${planId}`);
    return res.data?.businessPlan;
  },

  async getCropCycles(farmId) {
    const res = await api.get(`/farms/${farmId}/crop-cycles`);
    return res.data?.cropCycles || [];
  },

  async getCropCycle(farmId, cycleId) {
    const res = await api.get(`/farms/${farmId}/crop-cycles/${cycleId}`);
    return res.data?.cropCycle;
  },

  async createCropCycle(farmId, cycleData) {
    const res = await api.post(`/farms/${farmId}/crop-cycles`, cycleData);
    return res.data?.cropCycle;
  },

  async updateCropCycle(farmId, cycleId, cycleData) {
    const res = await api.patch(`/farms/${farmId}/crop-cycles/${cycleId}`, cycleData);
    return res.data?.cropCycle;
  },

  async getTasks(cycleId) {
    const res = await api.get(`/crop-cycles/${cycleId}/tasks`);
    return res.data?.tasks || [];
  },

  async createTask(cycleId, taskData) {
    const res = await api.post(`/crop-cycles/${cycleId}/tasks`, taskData);
    return res.data?.task;
  },

  async updateTask(cycleId, taskId, taskData) {
    const res = await api.patch(`/crop-cycles/${cycleId}/tasks/${taskId}`, taskData);
    return res.data?.task;
  },

  async getObservations(cycleId) {
    const res = await api.get(`/crop-cycles/${cycleId}/observations`);
    return res.data?.observations || [];
  },

  async addObservation(cycleId, obsData) {
    const res = await api.post(`/crop-cycles/${cycleId}/observations`, obsData);
    return res.data?.observation;
  }
};
