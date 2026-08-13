import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token from sessionStorage into headers
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle authentication issues (such as expired tokens)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect if session expires
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err, defaultMsg = 'Something went wrong') => {
  if (!err) return defaultMsg;
  const data = err.response?.data;
  if (!data) return err.message || defaultMsg;
  if (typeof data === 'string') return data;
  return data.message || data.error || defaultMsg;
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateTime = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const dateStr = formatDate(d);
  const timeStr = d.toLocaleTimeString();
  return `${dateStr}, ${timeStr}`;
};

export default API;
