import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

const TOKEN_KEY = 'photomind_access_token'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),

  setAccess: (access: string) => {
    localStorage.setItem(TOKEN_KEY, access)
  },

  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
  },
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccess()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

// Auth endpoints should never trigger the token-refresh dance: a 401 from
// /auth/login is "wrong email/password", not "your session expired". Letting
// it fall into the refresh flow swallowed the real error message and force-
// redirected to /login mid-attempt.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some((p) => url.includes(p))

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
       const response = await axios.post(
  `${BASE_URL}/auth/refresh`,
  {},
  {
    withCredentials: true,
  }
)

const { accessToken } = response.data.tokens

tokenStorage.setAccess(accessToken)
        processQueue(null, accessToken)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        tokenStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (data?.error?.issues?.length) {
      return data.error.issues
        .map((issue: { message: string }) => issue.message)
        .join(", ")
    }

    return (
      data?.error?.message ||
      data?.message ||
      error.message ||
      "Something went wrong"
    )
  }

  if (error instanceof Error) return error.message

  return "An unexpected error occurred"
}