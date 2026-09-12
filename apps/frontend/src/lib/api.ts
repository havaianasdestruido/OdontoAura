import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://backend-eta-pink.vercel.app/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const serverMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (status === 409) return 'Já existe uma conta com este email';
  if (status === 401) return 'Email ou senha incorretos';
  if (serverMessage) {
    return Array.isArray(serverMessage) ? serverMessage[0] : serverMessage;
  }
  if ((err as { code?: string })?.code === 'ECONNABORTED') return 'O servidor demorou para responder; tente novamente';
  return 'Não foi possível conectar ao servidor';
}
