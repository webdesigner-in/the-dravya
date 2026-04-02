import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — unwrap data and normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (axios.isAxiosError(error) && error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : null) ||
      error.message ||
      'Network error';
    const status = error.response?.status || 0;
    const err = new Error(message);
    err.status = status;
    err.data = error.response?.data || {};
    return Promise.reject(err);
  }
);

export default api;
