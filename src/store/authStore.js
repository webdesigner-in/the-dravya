import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/apiClient';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true, // Start true — always verify on mount
      isAuthenticated: false,
      tokenExpiry: null,

      clearUser: () => {
        set({ user: null, isLoading: false, isAuthenticated: false, tokenExpiry: null });
        if (typeof window !== 'undefined') localStorage.removeItem('auth-storage');
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
          // fetchUser will set the final state with all fields (upiId, businessName etc.)
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
          if (typeof window !== 'undefined') localStorage.removeItem('auth-storage');
        }
        return { success: true };
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          if (get().isTokenExpired()) {
            set({ user: null, isLoading: false, isAuthenticated: false, tokenExpiry: null });
            if (typeof window !== 'undefined') localStorage.removeItem('auth-storage');
            return;
          }
          const data = await api.get('/api/auth/me');
          const tokenExpiry = get().tokenExpiry || Date.now() + (24 * 60 * 60 * 1000);
          set({ user: data.user, isLoading: false, isAuthenticated: true, tokenExpiry });
        } catch {
          set({ user: null, isLoading: false, isAuthenticated: false, tokenExpiry: null });
          if (typeof window !== 'undefined') localStorage.removeItem('auth-storage');
        }
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) set({ user: { ...currentUser, ...updates } });
      },

      // Helper getters
      getUserRole: () => get().user?.role,
      getUserEmail: () => get().user?.email,
      getUserName: () => get().user?.name,
      getUserId: () => get().user?.id,
      isAdmin: () => get().user?.role === 'admin',
      isDistributor: () => get().user?.role === 'distributor',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokenExpiry: state.tokenExpiry,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const isExpired = state.tokenExpiry ? Date.now() > state.tokenExpiry : true;

        if (isExpired) {
          state.user = null;
          state.isAuthenticated = false;
          state.tokenExpiry = null;
          if (typeof window !== 'undefined') localStorage.removeItem('auth-storage');
        } else {
          state.isAuthenticated = !!state.user;
        }

        // Keep isLoading: true so AuthProvider always verifies with the server
        // before rendering protected content
        state.isLoading = true;
      },
    }
  )
);
