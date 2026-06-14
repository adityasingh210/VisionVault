import { api } from './client'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types'

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', payload)
    return data
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', payload)
    return data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  logoutAll: async (): Promise<void> => {
    await api.post('/auth/logout-all')
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const { data } = await api.post('/auth/refresh', { refreshToken })
    return data
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<{ user: User }>('/auth/me')
    return data.user
  },
}