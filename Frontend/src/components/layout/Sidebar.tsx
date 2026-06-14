import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Images,
  Upload,
  Search,
  Users,
  Tag,
  Calendar,
  Sparkles,
  Settings,
  ChevronLeft,
  Aperture,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { authApi } from '@/api/auth'
import { useQueryClient } from '@tanstack/react-query'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Upload', href: '/upload', icon: Upload },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Categories', href: '/categories', icon: Tag },
  { label: 'Events', href: '/events', icon: Calendar },
  { label: 'Memories', href: '/memories', icon: Sparkles },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()


  const queryClient = useQueryClient()
  const handleLogout = async () => {
  try {
    await authApi.logout()
  } finally {
    queryClient.clear()
    logout()
  }
}

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-full flex flex-col',
          'bg-surface-1 border-r border-border',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-[60px]',
          'lg:relative lg:z-auto'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 px-3 border-b border-border shrink-0',
          sidebarOpen ? 'justify-between' : 'justify-center'
        )}>
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Aperture className="w-4.5 h-4.5 text-primary" size={18} />
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-foreground tracking-tight truncate">
                PhotoMind
              </span>
            )}
          </Link>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              className="text-muted-foreground shrink-0"
            >
              <ChevronLeft size={16} />
            </Button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'nav-item group',
                  isActive && 'active',
                  !sidebarOpen && 'justify-center px-0'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon
                  size={18}
                  className={cn(
                    'nav-icon shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {sidebarOpen && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-border p-2 space-y-0.5">
          <Link
            to="/settings"
            className={cn(
              'nav-item group',
              location.pathname === '/settings' && 'active',
              !sidebarOpen && 'justify-center px-0'
            )}
          >
            <Settings
              size={18}
              className={cn(
                'shrink-0 transition-colors',
                location.pathname === '/settings'
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            {sidebarOpen && <span>Settings</span>}
          </Link>

          {/* User profile */}
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg mt-1',
            sidebarOpen ? '' : 'justify-center px-0'
          )}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-[10px]">{initials ?? 'U'}</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive shrink-0"
                title="Logout"
              >
                <LogOut size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Toggle button when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-border border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={12} className="rotate-180 text-muted-foreground" />
          </button>
        )}
      </aside>
    </>
  )
}