import { useState, useCallback, useEffect, useRef } from 'react'
import { getThumbnailUrl } from '@/lib/cloudinary'
import { useNavigate } from 'react-router-dom'
import {
  Images,
  Upload,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Download,
  LayoutGrid,
  LayoutList,
  SlidersHorizontal,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useInfiniteImages, useDeleteImage } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import type { GetImagesParams } from '@/api/images'
import type { Image } from '@/types'

type SortOption = { label: string; sort: GetImagesParams['sort']; order: GetImagesParams['order'] }
const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', sort: 'date', order: 'desc' },
  { label: 'Oldest first', sort: 'date', order: 'asc' },
  { label: 'Name A–Z', sort: 'name', order: 'asc' },
  { label: 'Name Z–A', sort: 'name', order: 'desc' },
]

interface LightboxProps {
  images: Image[]
  index: number
  onClose: () => void
  onNavigate: (i: number) => void
  onDelete: (id: string) => void
  deleting: boolean
}

function Lightbox({ images, index, onClose, onNavigate, onDelete, deleting }: LightboxProps) {
  const img = images[index]
  const url = getThumbnailUrl(img.cloudinaryUrl || img.url)

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {url && (
          <a
            href={url}
            download={img.originalName || img.filename || 'photo'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Download size={16} />
          </a>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(img.id) }}
          disabled={deleting}
          className="p-2 rounded-lg bg-white/10 hover:bg-destructive/80 text-white transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10">
        <span className="text-sm text-white/60 font-mono">{index + 1} / {images.length}</span>
      </div>

      {/* Prev */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Image */}
      <div className="max-w-5xl max-h-[85vh] mx-16" onClick={(e) => e.stopPropagation()}>
        {url ? (
          <img
            src={url}
            alt={img.originalName || img.filename || 'Photo'}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="w-96 h-64 bg-secondary rounded-lg flex items-center justify-center">
            <Images size={48} className="text-muted-foreground" />
          </div>
        )}
        {(img.originalName || img.filename) && (
          <p className="text-center text-sm text-white/60 mt-3">
            {img.originalName || img.filename}
          </p>
        )}
      </div>

      {/* Next */}
      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  )
}

interface PhotoCardProps {
  image: Image
  selected: boolean
  selectionMode: boolean
  onSelect: () => void
  onOpen: () => void
}

function PhotoCard({ image, selected, selectionMode, onSelect, onOpen }: PhotoCardProps) {
  const url = getThumbnailUrl(image.cloudinaryUrl || image.url)

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-200',
        'bg-secondary',
        selected
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-border hover:border-primary/30'
      )}
      onClick={() => selectionMode ? onSelect() : onOpen()}
    >
      {/* Checkbox overlay */}
      <div
        className={cn(
          'absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 bg-background transition-all duration-150',
          'flex items-center justify-center',
          selected
            ? 'border-primary bg-primary scale-100 opacity-100'
            : 'border-white/60 opacity-0 group-hover:opacity-100',
          selectionMode && 'opacity-100'
        )}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Hover zoom icon */}
      {!selectionMode && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-10">
          <ZoomIn size={20} className="text-white drop-shadow" />
        </div>
      )}

      {url ? (
        <img
          src={url}
          alt={image.originalName || image.filename || 'Photo'}
          className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="aspect-square flex items-center justify-center">
          <Images size={24} className="text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export default function GalleryPage() {
  const navigate = useNavigate()
  const [sortIdx, setSortIdx] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  const sort = SORT_OPTIONS[sortIdx]
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteImages({ sort: sort.sort, order: sort.order })

  const deleteImage = useDeleteImage()
 const allImages = data?.pages.flatMap((p) => p.images) ?? []

  useEffect(() => {
    if (!loaderRef.current || !hasNextPage) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage()
    }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleDelete = async (id: string) => {
    await deleteImage.mutateAsync(id)
    if (lightboxIdx !== null) setLightboxIdx(null)
    setConfirmDelete(null)
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await deleteImage.mutateAsync(id)
    }
    setSelected(new Set())
    setSelectionMode(false)
  }

const totalCount =
  data?.pages.reduce(
    (acc, page) => acc + page.pagination.count,
    0
  ) ?? 0

  if (!isLoading && allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
          <Images size={28} className="text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No photos yet</h2>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6 max-w-xs">
          Upload your first photos and they'll appear here, organized automatically by AI.
        </p>
        <Button onClick={() => navigate('/upload')}>
          <Upload size={15} className="mr-2" />
          Upload photos
        </Button>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle size={32} className="text-destructive mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Failed to load photos</h2>
        <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Gallery</h1>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs">
              {totalCount.toLocaleString()} photos
            </Badge>
          )}
          {selectionMode && selected.size > 0 && (
            <Badge variant="default" className="text-xs">
              {selected.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0 || deleteImage.isPending}
                onClick={handleBulkDelete}
              >
                {deleteImage.isPending
                  ? <Loader2 size={13} className="mr-1.5 animate-spin" />
                  : <Trash2 size={13} className="mr-1.5" />}
                Delete {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectionMode(false); setSelected(new Set()) }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(f => !f)} className={cn(showFilters && 'bg-secondary')}>
                <SlidersHorizontal size={16} />
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
              >
                {view === 'grid' ? <LayoutList size={16} /> : <LayoutGrid size={16} />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectionMode(true)}>
                Select
              </Button>
              <Button size="sm" onClick={() => navigate('/upload')}>
                <Upload size={13} className="mr-1.5" />
                Upload
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      {showFilters && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-surface-1 animate-slide-up">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          {SORT_OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSortIdx(i)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                i === sortIdx
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Grid / List ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className={cn(
            'grid gap-2',
            view === 'grid'
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          )}>
            {Array.from({ length: 24 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className={cn(
              'grid gap-2',
              view === 'grid'
                ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
            )}>
              {allImages.map((img, idx) => (
                <PhotoCard
                  key={img.id}
                  image={img}
                  selected={selected.has(img.id)}
                  selectionMode={selectionMode}
                  onSelect={() => toggleSelect(img.id)}
                  onOpen={() => setLightboxIdx(idx)}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="py-6 flex justify-center">
              {isFetchingNextPage && (
                <Loader2 size={20} className="text-muted-foreground animate-spin" />
              )}
              {!hasNextPage && allImages.length > 0 && (
                <p className="text-xs text-muted-foreground">All {totalCount} photos loaded</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <Lightbox
          images={allImages}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
          onDelete={handleDelete}
          deleting={deleteImage.isPending}
        />
      )}

      {/* ── Confirm delete (single) ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">Delete photo?</h3>
            <p className="text-sm text-muted-foreground mt-1.5">This action cannot be undone.</p>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteImage.isPending}
                onClick={() => handleDelete(confirmDelete)}
              >
                {deleteImage.isPending ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Trash2 size={13} className="mr-1.5" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}