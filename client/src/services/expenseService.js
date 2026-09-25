import api from './api';

export const expenseService = {
  async getExpenses(farmId, params = {}) {
    const res = await api.get(`/farms/${farmId}/expenses`, { params });
    return res.data;
  },

  async createExpense(farmId, expenseData) {
    const res = await api.post(`/farms/${farmId}/expenses`, expenseData);
    return res.data?.expense;
  },

  async updateExpense(farmId, expenseId, expenseData) {
    const res = await api.patch(`/farms/${farmId}/expenses/${expenseId}`, expenseData);
    return res.data?.expense;
  },

  async deleteExpense(farmId, expenseId) {
    const res = await api.delete(`/farms/${farmId}/expenses/${expenseId}`);
    return res.data;
  }
};
