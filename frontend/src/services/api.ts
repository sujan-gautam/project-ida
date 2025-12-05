import axios from 'axios';
import { Analysis, Dataset, ThreadMessage } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (unauthorized) - token expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired, clear it
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('analyzer_session');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/signup', { email, password, name });
    return response.data;
  },
  signin: async (email: string, password: string) => {
    const response = await api.post('/auth/signin', { email, password });
    return response.data;
  },
};

// Dataset APIs
export const datasetAPI = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getAll: async (): Promise<Dataset[]> => {
    const response = await api.get('/datasets');
    return response.data;
  },
  getById: async (id: string): Promise<Dataset> => {
    const response = await api.get(`/datasets/${id}`);
    return response.data;
  },
  analyze: async (id: string): Promise<Analysis> => {
    const response = await api.post(`/datasets/${id}/analyze`);
    return response.data;
  },
  preprocess: async (
    id: string,
    options: {
      handleInfinite?: boolean;
      missingValueMethod?: string;
      encodingMethod?: string;
      normalizationMethod?: string;
    }
  ) => {
    const response = await api.post(`/datasets/${id}/preprocess`, options);
    return response.data;
  },
  download: async (id: string) => {
    const response = await api.get(`/datasets/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  automate: async (id: string) => {
    const response = await api.post(`/datasets/${id}/automate`);
    return response.data;
  },
  summarize: async (
    id: string,
    prompt: string,
    isInitial: boolean = false,
    mode: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ) => {
    const response = await api.post(`/datasets/${id}/summarize`, {
      prompt,
      isInitial,
      mode,
    });
    return response.data;
  },
  getThreads: async (id: string): Promise<ThreadMessage[]> => {
    const response = await api.get(`/datasets/${id}/threads`);
    return response.data;
  },
  getSuggestions: async (
    id: string,
    mode: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<string[]> => {
    const response = await api.get(`/datasets/${id}/suggestions`, {
      params: { mode },
    });
    return response.data.suggestions;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/datasets/${id}`);
  },
};

// Admin APIs
export const adminAPI = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  getApiKeys: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) => {
    const response = await api.get('/admin/api-keys', { params });
    return response.data;
  },
  createApiKey: async (data: {
    userId: string;
    name: string;
    description?: string;
    rateLimit?: { requests: number; window: number };
    quota?: { total: number | null; used: number; resetDate: string };
    permissions?: {
      analyze: boolean;
      preprocess: boolean;
      summarize: boolean;
      export: boolean;
    };
  }) => {
    const response = await api.post('/admin/api-keys', data);
    return response.data;
  },
  updateApiKey: async (id: string, data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    rateLimit?: { requests: number; window: number };
    quota?: { total: number | null };
    permissions?: {
      analyze?: boolean;
      preprocess?: boolean;
      summarize?: boolean;
      export?: boolean;
    };
  }) => {
    const response = await api.patch(`/admin/api-keys/${id}`, data);
    return response.data;
  },
  deleteApiKey: async (id: string) => {
    const response = await api.delete(`/admin/api-keys/${id}`);
    return response.data;
  },
  getUsage: async (params?: {
    startDate?: string;
    endDate?: string;
    apiKeyId?: string;
  }) => {
    const response = await api.get('/admin/usage', { params });
    return response.data;
  },
  getDatasets: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
  }) => {
    const response = await api.get('/admin/datasets', { params });
    return response.data;
  },
};

export default api;

