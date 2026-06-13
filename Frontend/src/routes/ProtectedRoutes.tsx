import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { tokenStorage } from '@/api/client'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const token = tokenStorage.getAccess()

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function PublicOnlyRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const token = tokenStorage.getAccess()

  if (isAuthenticated || token) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}