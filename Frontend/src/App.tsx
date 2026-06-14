import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layouts/AppLayout'
import { AuthLayout } from './components/layouts/AuthLayout'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoutes'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import GalleryPage from './pages/GalleryPage'
import UploadPage from './pages/UploadPage'
import SearchPage from './pages/SearchPage'
import PeoplePage from './pages/PeoplePage'
import CategoriesPage from './pages/CategoriesPage'
import EventsPage from './pages/EventsPage'
import MemoriesPage from './pages/MemoriesPage'
import SettingsPage from './pages/SettingsPage'


function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-6xl font-bold text-muted-foreground/20 mb-4">404</div>
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground mt-2">The page you're looking for doesn't exist.</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      </Route>

 <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/gallery" element={<GalleryPage />} />
  <Route path="/upload" element={<UploadPage />} />
  <Route path="/search" element={<SearchPage />} />
  <Route path="/people" element={<PeoplePage />} />
  <Route path="/categories" element={<CategoriesPage />} />
  <Route path="/events" element={<EventsPage />} />
  <Route path="/memories" element={<MemoriesPage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}