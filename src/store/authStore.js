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
      // Only persist tokenExpiry — never persist user data in localStorage
      // The JWT is already secure in an httpOnly cookie
      // User data is fetched fresh from /api/auth/me on every load
      partialize: (state) => ({
        tokenExpiry: state.tokenExpiry,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Never restore user from localStorage — always verify with server
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = true;
      },
    }
  )
);
