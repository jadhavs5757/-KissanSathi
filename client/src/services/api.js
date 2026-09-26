import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token if stored in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kisansaarthi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to format errors cleanly without hijacking Supabase authentication
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || error.message || 'Network error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
