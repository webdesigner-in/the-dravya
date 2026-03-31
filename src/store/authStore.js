import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      tokenExpiry: null, // Store token expiration time
      
      setUser: (user, tokenExpiry = null) => set({ 
        user, 
        isLoading: false, 
        isAuthenticated: !!user,
        tokenExpiry: tokenExpiry || Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
      }),
      
      clearUser: () => {
        set({ 
          user: null, 
          isLoading: false, 
          isAuthenticated: false,
          tokenExpiry: null
        });
        
        // Clear persisted data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },
      
      // Check if token is expired
      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return true;
        return Date.now() > tokenExpiry;
      },
      
      // Check if user is authenticated and token is valid
      isValidSession: () => {
        const { isAuthenticated, isTokenExpired } = get();
        return isAuthenticated && !isTokenExpired();
      },
      
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

          // Set token expiry to 24 hours from now
          const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
          
          set({ 
            user: data.user, 
            isLoading: false, 
            isAuthenticated: true,
            tokenExpiry
          });
          
          // Fetch fresh user data to ensure all fields are loaded
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
          
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
          }

          // Set token expiry to 24 hours from now
          const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);

          set({ 
            user: data.user, 
            isLoading: false, 
            isAuthenticated: true,
            tokenExpiry
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
        } catch (error) {
          // Even if logout API fails, clear local state
          if (process.env.NODE_ENV === 'development') {
            console.error('Logout API failed:', error);
          }
        } finally {
          // Always clear auth state and localStorage
          set({ 
            user: null, 
            isLoading: false, 
            isAuthenticated: false,
            tokenExpiry: null
          });
          
          // Clear persisted data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
          }
        }
        
        return { success: true };
      },

      fetchUser: async () => {
        try {
          set({ isLoading: true });
          
          // Check if token is expired before making API call
          if (get().isTokenExpired()) {
            // Token expired - clear everything
            set({ 
              user: null, 
              isLoading: false, 
              isAuthenticated: false,
              tokenExpiry: null
            });
            
            // Clear persisted data
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-storage');
            }
            return;
          }
          
          const response = await fetch('/api/auth/me');
          
          if (!response.ok) {
            // Session expired or invalid - clear everything
            set({ 
              user: null, 
              isLoading: false, 
              isAuthenticated: false,
              tokenExpiry: null
            });
            
            // Clear persisted data
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-storage');
            }
            return;
          }

          const data = await response.json();
          
          // Keep existing token expiry or set new one
          const tokenExpiry = get().tokenExpiry || Date.now() + (24 * 60 * 60 * 1000);
          
          set({ 
            user: data.user, 
            isLoading: false, 
            isAuthenticated: true,
            tokenExpiry
          });
        } catch (error) {
          // Network error - clear auth state
          set({ 
            user: null, 
            isLoading: false, 
            isAuthenticated: false,
            tokenExpiry: null
          });
          
          // Clear persisted data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
          }
        }
      },
      
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
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
      // Persist user and tokenExpiry
      partialize: (state) => ({ 
        user: state.user,
        tokenExpiry: state.tokenExpiry
      }),
      // After rehydration, check if token is expired
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check if token is expired
          const isExpired = state.tokenExpiry ? Date.now() > state.tokenExpiry : true;
          
          if (isExpired) {
            // Token expired - clear everything
            state.user = null;
            state.isAuthenticated = false;
            state.tokenExpiry = null;
            
            // Clear persisted data
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-storage');
            }
          } else {
            // Token still valid
            state.isAuthenticated = !!state.user;
          }
          
          state.isLoading = false;
        }
      },
    }
  )
);
