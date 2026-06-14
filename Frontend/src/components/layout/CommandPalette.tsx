import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getThumbnailUrl } from '@/lib/cloudinary'
import {
  LayoutDashboard,
  Images,
  Upload,
  Users,
  Tag,
  Calendar,
  Sparkles,
  Settings,
  Search,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useSearch } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Upload photos', href: '/upload', icon: Upload },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Categories', href: '/categories', icon: Tag },
  { label: 'Events', href: '/events', icon: Calendar },
  { label: 'Memories', href: '/memories', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data: searchResults } = useSearch(query)

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
      if (e.key === 'Escape') {
        setCommandOpen(false)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandOpen, setCommandOpen])

  if (!commandOpen) return null

  const filteredNav = query
    ? navLinks.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
    : navLinks

  const handleNavigate = (href: string) => {
    navigate(href)
    setCommandOpen(false)
    setQuery('')
  }

  const handleSearchSubmit = () => {
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
      setCommandOpen(false)
      setQuery('')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            placeholder="Search photos, people, events…"
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2 no-scrollbar">
          {query && (
            <div className="px-2 mb-1">
              <button
                onClick={handleSearchSubmit}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm',
                  'text-primary hover:bg-primary/10 transition-colors'
                )}
              >
                <Search size={14} />
                <span>Search for "<strong>{query}</strong>"</span>
              </button>
            </div>
          )}

          {filteredNav.length > 0 && (
            <div className="px-2">
              <p className="text-[11px] font-medium text-muted-foreground px-3 py-1 uppercase tracking-wider">
                Navigation
              </p>
              {filteredNav.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigate(item.href)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Icon size={14} className="shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}

          {searchResults && searchResults.images.length > 0 && (
            <div className="px-2 mt-2">
              <p className="text-[11px] font-medium text-muted-foreground px-3 py-1 uppercase tracking-wider">
                Photos ({searchResults.total})
              </p>
              <div className="grid grid-cols-4 gap-1.5 px-3 py-2">
                {searchResults.images.slice(0, 8).map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleNavigate(`/gallery?preview=${img.id}`)}
                    className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={getThumbnailUrl(img.cloudinaryUrl || img.url)}
                      alt={img.filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}