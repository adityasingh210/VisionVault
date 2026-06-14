import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tokenStorage } from '@/api/client'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setAuthenticated: (value: boolean) => void
  setLoading: (value: boolean) => void
 login: (user: User, accessToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLoading: (value) => set({ isLoading: value }),

login: (user, accessToken) => {
  if (!accessToken) {
    console.error("Access token missing during login", {
      user,
      accessToken,
    })

    return
  }

  tokenStorage.setAccess(accessToken)

  set({
    user,
    isAuthenticated: true,
    isLoading: false,
  })
},

      logout: () => {
        tokenStorage.clear()
        set({ user: null, isAuthenticated: false, isLoading: false })
      },
    }),
  {
  name: 'photomind-auth',

partialize: (state) => ({
  user: state.user,
}),

 onRehydrateStorage: () => (state) => {
  const token = tokenStorage.getAccess()

  state?.setAuthenticated(!!token)
  state?.setLoading(false)
},
}
  )
)