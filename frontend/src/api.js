import axios from 'axios';
import {prepareRequest,finishRequest} from './utils/requestSafety';
import {sessionToken} from './utils/sessionGuard';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// axios.create() does not inherit the interceptors registered on default axios.
// Read the current token for every request, including after a new login.
api.interceptors.request.use((config) => {
  const token = sessionToken(config.url);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.sessionToken = token;
  prepareRequest(config);
  return config;
});

api.interceptors.response.use(
  (r) => { if(r.config.sessionToken && r.config.sessionToken!==localStorage.getItem('garage_token'))return Promise.reject(new Error('Phiên đã thay đổi. Vui lòng tải lại trang.'));finishRequest(r.config);return r; },
  (err) => {
    if(err.response?.status>=400 && err.response.status<500)finishRequest(err.config);
    if (err.response?.status === 401 && err.config?.sessionToken && err.config.sessionToken===localStorage.getItem('garage_token') && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('garage_token');
      localStorage.removeItem('garage_user');
      window.location.href = '/login';
    }
    console.error('API error:', err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
