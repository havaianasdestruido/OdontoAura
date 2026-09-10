// TODO: replace axios with native fetch to save ~13KB client bundle
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://odonto-aura-backend.vercel.app/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  // TODO: add centralized error mapping — distinguish network failures (no response) from API errors (4xx/5xx) so callers get a typed error instead of raw AxiosError
  // TODO: add request timeout via AbortController or axios timeout config (e.g. 15 s) to prevent hanging requests on slow/unreachable backends
  // TODO: add retry with exponential backoff on transient failures (5xx, network errors) — skip on 4xx client errors
  // TODO: add centralized error mapping — distinguish network failures (no response) from API errors (4xx/5xx) so callers can handle them uniformly instead of catching raw AxiosError
  // TODO: add request timeout via AbortController or axios timeout option — requests can hang indefinitely on slow/unreachable backends
  // TODO: add retry with exponential backoff for transient failures (5xx, network) — skip on 4xx client errors
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);
