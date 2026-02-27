import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      
      setUser: (user) => set({ 
        user, 
        isLoading: false, 
        isAuthenticated: !!user 
      }),
      
      clearUser: () => set({ 
        user: null, 
        isLoading: false, 
        isAuthenticated: false 
      }),
      
      login: async (email, password) => {
        try {
          set({ isLoading: true });
          
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }

          set({ 
            user: data.user, 
            isLoading: false, 
            isAuthenticated: true 
          });
          
          return { success: true, user: data.user };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
          }

          set({ 
            user: data.user, 
            isLoading: false, 
            isAuthenticated: true 
          });
          
          return { success: true, user: data.user };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
          set({ 
            user: null, 
            isLoading: false, 
            isAuthenticated: false 
          });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      fetchUser: async () => {
        try {
          set({ isLoading: true });
          
          const response = await fetch('/api/auth/me');
          
          if (!response.ok) {
            set({ 
              user: null, 
              isLoading: false, 
              isAuthenticated: false 
            });
            return;
          }

          const data = await response.json();
          set({ 
            user: data.user, 
            isLoading: false, 
            isAuthenticated: true 
          });
        } catch (error) {
          set({ 
            user: null, 
            isLoading: false, 
            isAuthenticated: false 
          });
        }
      },
      
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
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
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
