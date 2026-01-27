import axios from 'axios';

const API_BASE = 'http://localhost:4001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const assessmentApi = {
  list: (page: number, limit: number) =>
    api.get(`/assessments/list?page=${page}&limit=${limit}`),
  getById: (id: string) =>
    api.get(`/assessments/${id}`),
  stats: () =>
    api.get('/assessments/stats'),
};

export const accessCodeApi = {
  generate: (count: number) =>
    api.post('/access-codes/generate', { count }),
  list: (page: number, limit: number, filter: string) =>
    api.get(`/access-codes/list?page=${page}&limit=${limit}&filter=${filter}`),
  stats: () =>
    api.get('/access-codes/stats'),
  export: () =>
    api.get('/access-codes/export', { responseType: 'blob' }),
  exportBatch: (batchId: string) =>
    api.get(`/access-codes/export/${batchId}`, { responseType: 'blob' }),
};

export default api;
