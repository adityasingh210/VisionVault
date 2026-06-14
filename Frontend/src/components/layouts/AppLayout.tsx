import { Outlet } from 'react-router-dom'
import { Sidebar } from '../layout/Sidebar'
import { Header } from '../layout/Header'
import { CommandPalette } from '../layout/CommandPalette'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 overflow-hidden',
          'transition-all duration-300'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}