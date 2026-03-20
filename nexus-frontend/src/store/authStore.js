/**
 * store/authStore.js
 *
 * ROOT CAUSE OF CART BLANK SCREEN + DROPDOWN NOT CLOSING:
 * isAuthenticated was a JavaScript getter (get isAuthenticated() { ... })
 * Zustand stores state as a plain snapshot object. JS getters are NOT included
 * in Zustand snapshots, so every component that reads isAuthenticated gets
 * undefined. This means:
 *   - ProtectedRoute: isAuthenticated = undefined → treats as logged out → redirects to /login
 *   - CartPage never loads (redirected away)
 *   - Navbar: isAuthenticated = undefined → dropdown conditionals break → can't close
 *
 * FIX: isAuthenticated is now stored as a plain boolean in state.
 * It is set to true by setAuth() and false by logout().
 * It is also persisted to localStorage so it survives page refresh.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Auth store ────────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,  // plain boolean — Zustand can subscribe and react to this

      // Called after login success or OTP verification
      setAuth: (user, token) => set({
        user,
        token,
        isAuthenticated: !!(user && token),
      }),

      // Update phone verification status without full re-login
      setPhoneVerified: (verified) =>
        set(state => ({
          user: state.user ? { ...state.user, isPhoneVerified: verified } : null,
        })),

      // Merge partial profile updates without wiping session
      updateUser: (updates) =>
        set(state => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Full logout — clears everything
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'nexus-auth',
      // Persist all three so the session survives page refresh
      partialize: (state) => ({
        user:            state.user,
        token:           state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Note: isPhoneVerified is stored inside user object, so it's already persisted
    }
  )
)

// ── Cart count store (navbar badge) ───────────────────────────────────────────
// Not persisted — synced from API response on CartPage mount
export const useCartStore = create((set) => ({
  count:     0,
  setCount:  (count) => set({ count }),
  increment: ()      => set(s => ({ count: s.count + 1 })),
  decrement: ()      => set(s => ({ count: Math.max(0, s.count - 1) })),
}))

// ── Theme store ───────────────────────────────────────────────────────────────
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light',

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.classList.toggle('dark', next === 'dark')
        set({ theme: next })
      },

      initTheme: () => {
        const stored      = get().theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const theme       = stored || (prefersDark ? 'dark' : 'light')
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },
    }),
    { name: 'nexus-theme' }
  )
)