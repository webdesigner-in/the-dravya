import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/apiClient';

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
    window.location.replace('/login');
  }
};

const clearStorage = () => {
  if (typeof window !== 'undefined') localStorage.removeItem('auth-storage');
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      tokenExpiry: null,

      clearUser: () => {
        set({ user: null, isLoading: false, isAuthenticated: false, tokenExpiry: null });
        clearStorage();
      },

      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return true;
        return Date.now() > tokenExpiry;
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true });
          const data = await api.post('/api/auth/login', { email, password });
          const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
          set({ user: data.user, isAuthenticated: true, tokenExpiry });
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
          const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
          set({ user: data.user, isLoading: false, isAuthenticated: true, tokenExpiry });
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
          set({ user: null, isLoading: false, isAuthenticated: false, tokenExpiry: null });
          clearStorage();
        }
        return { success: true };
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          // If token is expired or missing, don't even hit the API
          if (get().isTokenExpired()) {
            set({ user: null, isLoading: false, isAuthenticated: false, tokenExpiry: null });
            clearStorage();
            redirectToLogin();
            return;
          }
          const data = await api.get('/api/auth/me');
          const tokenExpiry = get().tokenExpiry || Date.now() + (24 * 60 * 60 * 1000);
          set({ user: data.user, isLoading: false, isAuthenticated: true, tokenExpiry });
        } catch {
          // Cookie invalid / expired / network error — clear and redirect
          set({ user: null, isLoading: false, isAuthenticated: false, tokenExpiry: null });
          clearStorage();
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
      partialize: (state) => ({
        user: state.user,
        tokenExpiry: state.tokenExpiry,
      }),
      onRehydrateStorage: () => (state) => {
        // state is null when localStorage was cleared/tampered
        if (!state) {
          // Can't mutate null — the store will use initial values (isLoading: true)
          // AuthProvider will call fetchUser which will redirect to login
          return;
        }

        const isExpired = state.tokenExpiry ? Date.now() > state.tokenExpiry : true;

        if (isExpired) {
          state.user = null;
          state.isAuthenticated = false;
          state.tokenExpiry = null;
          clearStorage();
        } else {
          state.isAuthenticated = !!state.user;
        }

        // Always keep isLoading: true after rehydration so AuthProvider
        // verifies the session with the server before rendering content
        state.isLoading = true;
      },
    }
  )
);
