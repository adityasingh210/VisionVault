import { useState } from 'react'
import { getThumbnailUrl } from '@/lib/cloudinary'
import {
  CalendarDays,
  ChevronLeft,
  ImageIcon,
  ZoomIn,
  X,
  AlertCircle,
  MapPin,
  Clock,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'
import { useEvents, useEvent } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import type { PhotoEvent, Image } from '@/types'

function formatEventDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatEventYear(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).getFullYear().toString()
  } catch {
    return ''
  }
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
  const url = getThumbnailUrl(img.cloudinaryUrl || img.url);

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
          'absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10 text-xl leading-none',
          index === 0 && 'opacity-30 pointer-events-none'
        )}
        onClick={(e) => { e.stopPropagation(); onNavigate(index - 1) }}
      >
        ‹
      </button>
      <button
        className={cn(
          'absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10 text-xl leading-none',
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

function EventDetail({
  event,
  onBack,
}: {
  event: PhotoEvent
  onBack: () => void
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { data, isLoading, isError, error } = useEvent(event.id)

  const images = data?.images ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="h-4 w-px bg-border mt-0.5 shrink-0" />
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground truncate">{event.title}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {event.startDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={11} />
                  {formatEventDate(event.startDate)}
                </span>
              )}
              {!isLoading && !isError && (
                <span className="text-xs text-muted-foreground">
                  {images.length === 0
                    ? 'No photos'
                    : images.length === 1
                    ? '1 photo'
                    : `${images.length} photos`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
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
          <h3 className="text-base font-semibold text-foreground mb-1">Failed to load photos</h3>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || 'Something went wrong.'}
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && images.length === 0 && (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description="No photos have been linked to this event yet."
        />
      )}

      {/* Grid */}
      {!isLoading && !isError && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {images.map((img, i) => {
            const url = getThumbnailUrl(img.cloudinaryUrl || img.url)
            return (
              <div
                key={img.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-secondary cursor-pointer"
                onClick={() => setLightboxIndex(i)}
              >
                {url ? (
                  <img
                    src={url}
                    alt={img.originalName || 'Photo'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn
                    size={18}
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}

// ─── Event Card ────────────────────────────────────────────────────────────────

function EventCard({
  event,
  onClick,
}: {
  event: PhotoEvent
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left hover:border-primary/40 hover:bg-card/80 hover:shadow-sm transition-all duration-200"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
        <CalendarDays size={18} className="text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate mb-1">
          {event.title}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {event.startDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} />
              {formatEventDate(event.startDate)}
            </span>
          )}
          {event.imageCount != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon size={11} />
              {event.imageCount} {event.imageCount === 1 ? 'photo' : 'photos'}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronLeft
        size={14}
        className="rotate-180 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150 shrink-0 mt-1"
      />
    </button>
  )
}

// ─── Timeline Group ────────────────────────────────────────────────────────────

function TimelineGroup({
  year,
  events,
  onSelect,
}: {
  year: string
  events: PhotoEvent[]
  onSelect: (event: PhotoEvent) => void
}) {
  return (
    <div className="relative">
      {/* Year label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border">
          <CalendarDays size={13} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{year}</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground shrink-0">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Events */}
      <div className="space-y-3 pl-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onClick={() => onSelect(event)} />
        ))}
      </div>
    </div>
  )
}

// ─── Events Page ───────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<PhotoEvent | null>(null)

  const { data: events, isLoading, isError, error } = useEvents()

  // Group events by year
  const grouped = (() => {
    if (!events || events.length === 0) return []
    const map = new Map<string, PhotoEvent[]>()
    for (const event of events) {
      const year = formatEventYear(event.startDate) || 'Unknown'
      if (!map.has(year)) map.set(year, [])
      map.get(year)!.push(event)
    }
    // Sort years descending
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === 'Unknown') return 1
      if (b[0] === 'Unknown') return -1
      return Number(b[0]) - Number(a[0])
    })
  })()

  if (selectedEvent) {
    return (
      <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto">
        <EventDetail
          event={selectedEvent}
          onBack={() => setSelectedEvent(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Events</h1>
          <p className="text-sm text-muted-foreground">
            Automatically detected events from your photo timeline
          </p>
        </div>
        {!isLoading && !isError && events && events.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, g) => (
            <div key={g}>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-3 pl-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle size={22} className="text-destructive" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Failed to load events</h3>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && (!events || events.length === 0) && (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Upload photos with dates and the AI will automatically group them into events."
        />
      )}

      {/* Timeline */}
      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-10">
          {grouped.map(([year, yearEvents]) => (
            <TimelineGroup
              key={year}
              year={year}
              events={yearEvents}
              onSelect={setSelectedEvent}
            />
          ))}
        </div>
      )}
    </div>
  )
}