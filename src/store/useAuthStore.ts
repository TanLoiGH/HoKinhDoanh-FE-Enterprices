import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'Admin' | 'Cashier' | 'Warehouse';
  branchId: number | null;
  token: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateTokens: (token: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
      },
      updateTokens: (token, refreshToken) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, token, refreshToken } });
        }
      },
    }),
    {
      name: 'auth-storage',
      // partialize giúp loại bỏ refreshToken ra khỏi localStorage để tránh bị tấn công XSS đánh cắp
      partialize: (state) => {
        if (!state.user) return state;
        const { refreshToken, ...userWithoutRefreshToken } = state.user;
        return {
          ...state,
          user: userWithoutRefreshToken,
        };
      },
    }
  )
);

