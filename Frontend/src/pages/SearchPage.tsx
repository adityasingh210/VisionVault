import { useState, useEffect, useRef, useCallback } from 'react'
import { getThumbnailUrl } from '@/lib/cloudinary'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Clock,
  Sparkles,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ZoomIn,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'
import { useSearch } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import type { Image } from '@/types'

const RECENT_SEARCHES_KEY = 'vv:recent_searches'
const MAX_RECENT = 8

const SUGGESTIONS = [
  'sunset beach',
  'birthday party',
  'passport document',
  'mountain hike',
  'family dinner',
  'concert',
  'receipt invoice',
  'dog cat',
]

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentSearch(q: string) {
  const prev = getRecentSearches().filter((s) => s !== q)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)))
}

function removeRecentSearch(q: string) {
  const next = getRecentSearches().filter((s) => s !== q)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
}

function ImageCard({ image, onClick }: { image: Image; onClick: () => void }) {
  const url = getThumbnailUrl(
  image.cloudinaryUrl || image.url
)
  return (
    <div
      className="group relative overflow-hidden rounded-xl bg-surface-2 cursor-pointer aspect-square"
      onClick={onClick}
    >
      {url ? (
        <img
          src={url}
          alt={image.originalName || image.filename || 'Photo'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon size={28} className="text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
        <ZoomIn
          size={20}
          className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        />
      </div>
    </div>
  )
}

function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: Image[]
  index: number
  onClose: () => void
  onNavigate: (i: number) => void
}) {
  const img = images[index]
  const url = getThumbnailUrl(
  img?.cloudinaryUrl || img?.url
)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, images.length, onClose, onNavigate])

  if (!img) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <button
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10',
          index === 0 && 'opacity-30 pointer-events-none'
        )}
        onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
      >
        ‹
      </button>
      <button
        className={cn(
          'absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10',
          index === images.length - 1 && 'opacity-30 pointer-events-none'
        )}
        onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
      >
        ›
      </button>
      {url && (
        <img
          src={url}
          alt={img.originalName || 'Photo'}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
        {index + 1} / {images.length}
      </div>
    </div>
  )
}
function ResultsGrid({ images }: { images: Image[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {images.map((img, i) => (
          <ImageCard key={img.id} image={img} onClick={() => setLightboxIndex(i)} />
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  )
}


type SearchMode = 'semantic' | 'ocr'

export default function SearchPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('semantic')
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches)

  const { data, isLoading, isError, error } = useSearch(query)

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed) return
      addRecentSearch(trimmed)
      setRecentSearches(getRecentSearches())
      setQuery(trimmed)
    },
    []
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit(inputValue)
  }

  const handleClear = () => {
    setInputValue('')
    setQuery('')
    inputRef.current?.focus()
  }

  const handleRemoveRecent = (s: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeRecentSearch(s)
    setRecentSearches(getRecentSearches())
  }

  const handleSuggestionClick = (s: string) => {
    setInputValue(s)
    handleSubmit(s)
  }


const images = data?.data ?? []
  const showHome = !query
  const showResults = !!query

  return (
    <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find photos by description, objects, or text in images
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-2xl mb-4">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 size={16} className="text-muted-foreground animate-spin" />
          ) : (
            <Search size={16} className="text-muted-foreground" />
          )}
        </div>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'semantic' ? 'Describe a scene, object, or moment…' : 'Search for text found in photos…'}
          className="pl-9 pr-20 h-11 text-base rounded-xl"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
        <Button
          onClick={() => handleSubmit(inputValue)}
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8"
        >
          Search
        </Button>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={() => setMode('semantic')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            mode === 'semantic'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <Sparkles size={12} />
          AI Semantic
        </button>
        <button
          onClick={() => setMode('ocr')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            mode === 'ocr'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <FileText size={12} />
          Text in Photos
        </button>
      </div>

      {/* Home state: recents + suggestions */}
      {showHome && (
        <div className="space-y-8">
          {recentSearches.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Recent Searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => handleSuggestionClick(s)}
                  >
                    <Clock size={12} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{s}</span>
                    <button
                      onClick={(e) => handleRemoveRecent(s, e)}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Try Searching For
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary/20 hover:text-primary text-sm text-muted-foreground transition-colors"
                >
                  <Search size={12} />
                  {s}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Results state */}
      {showResults && (
        <div>
          {/* Result header */}
          {!isLoading && !isError && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {images.length > 0 ? (
                  <>
                    <span className="font-medium text-foreground">{data?.total ?? images.length}</span>{' '}
                    {(data?.total ?? images.length) === 1 ? 'result' : 'results'} for{' '}
                    <span className="font-medium text-foreground">"{query}"</span>
                  </>
                ) : null}
              </p>
              <button
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle size={22} className="text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Search failed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {(error as Error)?.message || 'Something went wrong. Please try again.'}
              </p>
              <Button size="sm" variant="outline" onClick={() => handleSubmit(query)}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && images.length === 0 && (
            <EmptyState
              icon={Search}
              title="No photos found"
              description={`We couldn't find any photos matching "${query}". Try different keywords or a broader description.`}
            />
          )}

          {/* Results */}
          {!isLoading && !isError && images.length > 0 && (
            <ResultsGrid images={images} />
          )}
        </div>
      )}
    </div>
  )
}