import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// axios.create() does not inherit the interceptors registered on default axios.
// Read the current token for every request, including after a new login.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('garage_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('garage_token');
      localStorage.removeItem('garage_user');
      window.location.href = '/login';
    }
    console.error('API error:', err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
