import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/apiClient';

const AUTH_ERROR_STATUSES = new Set([401, 403]);

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
    window.location.replace('/login');
  }
};

const isAuthenticationError = (error) => AUTH_ERROR_STATUSES.has(error?.status);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      authError: null,

      clearUser: () => {
        set({ user: null, isLoading: false, isAuthenticated: false, authError: null });
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true, authError: null });
          const data = await api.post('/api/auth/login', { email, password });
          set({ user: data.user, isAuthenticated: true });
          await get().fetchUser();
          return { success: true, user: data.user };
        } catch (error) {
          set({ isLoading: false, authError: null });
          return { success: false, error: error.message };
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true, authError: null });
          const data = await api.post('/api/auth/register', userData);
          set({ user: data.user, isAuthenticated: true });
          await get().fetchUser();
          return { success: true, user: data.user };
        } catch (error) {
          set({ isLoading: false, authError: null });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        try {
          await api.post('/api/auth/logout');
        } catch {
          // Even if logout API fails, clear local state
        } finally {
          set({ user: null, isLoading: false, isAuthenticated: false, authError: null });
        }
        return { success: true };
      },

      fetchUser: async ({ retries = 1, retryDelayMs = 750 } = {}) => {
        set({ isLoading: true, authError: null });

        for (let attempt = 0; attempt <= retries; attempt += 1) {
          try {
            const data = await api.get('/api/auth/me');
            set({ user: data.user, isLoading: false, isAuthenticated: true, authError: null });
            return { success: true, user: data.user };
          } catch (error) {
            if (isAuthenticationError(error)) {
              set({ user: null, isLoading: false, isAuthenticated: false, authError: null });
              redirectToLogin();
              return { success: false, isAuthError: true, error };
            }

            if (attempt < retries) {
              await wait(retryDelayMs * (attempt + 1));
              continue;
            }

            set((state) => ({
              user: state.user,
              isLoading: false,
              isAuthenticated: state.isAuthenticated,
              authError: error?.message || 'Unable to verify your session right now.',
            }));
            return { success: false, isAuthError: false, error };
          }
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
        state.authError = null;
      },
    }
  )
);
