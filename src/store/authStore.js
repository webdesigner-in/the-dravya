import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/apiClient';

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
    window.location.replace('/login');
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      clearUser: () => {
        set({ user: null, isLoading: false, isAuthenticated: false });
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true });
          const data = await api.post('/api/auth/login', { email, password });
          set({ user: data.user, isAuthenticated: true });
          await get().fetchUser();
          return { success: true, user: data.user };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          const data = await api.post('/api/auth/register', userData);
          set({ user: data.user, isLoading: false, isAuthenticated: true });
          return { success: true, user: data.user };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        try {
          await api.post('/api/auth/logout');
        } catch {
          // Even if logout API fails, clear local state
        } finally {
          set({ user: null, isLoading: false, isAuthenticated: false });
        }
        return { success: true };
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const data = await api.get('/api/auth/me');
          set({ user: data.user, isLoading: false, isAuthenticated: true });
        } catch {
          set({ user: null, isLoading: false, isAuthenticated: false });
          redirectToLogin();
        }
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) set({ user: { ...currentUser, ...updates } });
      },

      getUserRole:    () => get().user?.role,
      getUserEmail:   () => get().user?.email,
      getUserName:    () => get().user?.name,
      getUserId:      () => get().user?.id,
      isAdmin:        () => get().user?.role === 'admin',
      isDistributor:  () => get().user?.role === 'distributor',
    }),
    {
      name: 'auth-storage',
      partialize: () => ({}),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = true;
      },
    }
  )
);
