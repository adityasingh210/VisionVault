import { Menu, Search, Upload, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'
import { Link } from 'react-router-dom'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { toggleSidebar, setCommandOpen } = useUIStore()

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden text-muted-foreground"
        >
          <Menu size={20} />
        </Button>
        {title && (
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">{title}</h1>
        )}
      </div>

      {/* Center - search trigger */}
      <button
        onClick={() => setCommandOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-muted-foreground text-sm hover:bg-secondary hover:text-foreground transition-all w-64 lg:w-80"
      >
        <Search size={14} />
        <span className="flex-1 text-left text-xs">Search photos, people, events…</span>
        <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono hidden lg:inline">
          ⌘K
        </kbd>
      </button>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandOpen(true)}
          className="sm:hidden text-muted-foreground"
        >
          <Search size={20} />
        </Button>
        <Link to="/upload">
          <Button variant="ghost" size="icon" className="text-muted-foreground" title="Upload">
            <Upload size={18} />
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  )
}