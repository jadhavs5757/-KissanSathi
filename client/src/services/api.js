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

// Response interceptor to handle session expiration cleanly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if expired or invalid
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        localStorage.removeItem('kisansaarthi_token');
        localStorage.removeItem('kisansaarthi_user');
        window.location.href = '/login?expired=true';
      }
    }
    const message = error.response?.data?.error?.message || error.message || 'Network error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
