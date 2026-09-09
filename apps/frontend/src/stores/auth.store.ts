import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  status: 'idle',
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, status: 'authenticated' });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, status: 'unauthenticated' });
  },
  isAuthenticated: () => !!get().token,
  hydrate: async () => {
    const token = get().token;
    if (!token) {
      set({ user: null, status: 'unauthenticated' });
      return;
    }
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data, status: 'authenticated' });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, status: 'unauthenticated' });
    }
  },
}));
