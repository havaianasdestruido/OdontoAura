// TODO: add cross-tab logout guard (listen to 'storage' event) and clear React Query cache on logout
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

  // TODO: add persist with version + migrate so token format changes don't silently break hydration
  // TODO: use shallow selector (useAuthStore(s => s.user)) instead of whole-store read to avoid unnecessary rerenders
  // TODO: token in localStorage is accessible to any JS on the page — evaluate HttpOnly cookie option to mitigate XSS token theft
  // TODO: add persist with version + migrate callback — without it, token format changes silently break hydration on next load
  // TODO: components selecting the whole store (useAuthStore()) rerender on every state change — use shallow equality selectors (useAuthStore(s => s.user)) instead
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  status: 'idle',
  // TODO: token in localStorage is exposed to XSS — evaluate HttpOnly cookie option for session tokens
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
