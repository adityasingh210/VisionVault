import { useState } from 'react'
import { getThumbnailUrl } from '@/lib/cloudinary'
import {
  Sparkles,
  Users,
  CalendarDays,
  MapPin,
  BookOpen,
  Clock,
  ImageIcon,
  ZoomIn,
  X,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'
import {
  useHighlights,
  useMemoryPeople,
  useMemoryEvents,
  useMemoryDocuments,
  useMonthlyMemories,
  useTravelMemories,
} from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import type {
  MemoryHighlight,
  MemoryPerson,
  MemoryEvent,
  MemoryDocument,
  MemoryMonthly,
  MemoryTravel,
  Image,
} from '@/types'

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
if (!img) return null
const url =img.cloudinaryUrl ||img.url ||''
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
      >‹</button>
      <button
        className={cn(
          'absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10 text-xl leading-none',
          index === images.length - 1 && 'opacity-30 pointer-events-none'
        )}
        onClick={(e) => { e.stopPropagation(); onNavigate(index + 1) }}
      >›</button>
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


function ImageGrid({ images }: { images: Image[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  if (images.length === 0) return null
  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
        {images.map((img, i) => {
          const url = getThumbnailUrl(img.cloudinaryUrl || img.url)
          return (
            <div
              key={img.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-secondary cursor-pointer"
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
                  <ImageIcon size={18} className="text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )
        })}
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

function Section({
  title,
  icon,
  iconColor,
  iconBg,
  count,
  loading,
  error,
  empty,
  children,
}: {
  title: string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  count?: number
  loading?: boolean
  error?: Error | null
  empty?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg, iconColor)}>
          {icon}
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {count != null && count > 0 && (
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <AlertCircle size={15} className="shrink-0" />
          {(error as Error)?.message || 'Failed to load.'}
        </div>
      )}
      {empty && !loading && !error && (
        <p className="text-sm text-muted-foreground py-4">No {title.toLowerCase()} yet.</p>
      )}
      {!loading && !error && !empty && children}
    </section>
  )
}

function HighlightCard({
  highlight,
  onClick,
}: {
  highlight: MemoryHighlight
  onClick: () => void
}) {
  const cover = highlight.images[0]

const coverUrl = getThumbnailUrl(
  cover?.cloudinaryUrl || cover?.url
)
  return (
    <button
      onClick={onClick}
      className="group relative flex-shrink-0 w-48 rounded-xl border border-border bg-card overflow-hidden text-left hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className="aspect-[4/3] w-full bg-secondary overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={highlight.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles size={24} className="text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-xs font-semibold text-white truncate">{highlight.title}</p>
        <p className="text-xs text-white/60 mt-0.5">
          {highlight.images.length} {highlight.images.length === 1 ? 'photo' : 'photos'}
        </p>
      </div>
    </button>
  )
}


function HighlightDetail({ highlight, onBack }: { highlight: MemoryHighlight; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Memories
        </button>
        <div className="h-4 w-px bg-border" />
        <h2 className="text-lg font-semibold text-foreground truncate">{highlight.title}</h2>
      </div>
      <ImageGrid images={highlight.images} />
    </div>
  )
}

function HighlightsSection() {
  const [selected, setSelected] = useState<MemoryHighlight | null>(null)
  const { data: highlights = [], isLoading, isError, error } = useHighlights()

  if (selected) {
    return <HighlightDetail highlight={selected} onBack={() => setSelected(null)} />
  }

  return (
    <Section
      title="Highlights"
      icon={<Sparkles size={15} />}
      iconColor="text-amber-500"
      iconBg="bg-amber-500/10"
      count={highlights.length}
      loading={isLoading}
      error={isError ? (error as Error) : null}
      empty={highlights.length === 0}
    >
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {highlights.map((h) => (
          <HighlightCard key={h.id} highlight={h} onClick={() => setSelected(h)} />
        ))}
      </div>
    </Section>
  )
}

function PeopleSection() {
  const { data: people = [], isLoading, isError, error } = useMemoryPeople()
  return (
    <Section
      title="People"
      icon={<Users size={15} />}
      iconColor="text-blue-500"
      iconBg="bg-blue-500/10"
      count={people.length}
      loading={isLoading}
      error={isError ? (error as Error) : null}
      empty={people.length === 0}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {people.map((person: MemoryPerson) => (
          <div
            key={person.id}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Users size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground truncate w-full">
              {person.name || 'Unknown'}
            </p>
            {person.imageCount != null && (
              <p className="text-xs text-muted-foreground">{person.imageCount} photos</p>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

function EventsMemorySection() {
  const { data: events = [], isLoading, isError, error } = useMemoryEvents()
  return (
    <Section
      title="Event Memories"
      icon={<CalendarDays size={15} />}
      iconColor="text-violet-500"
      iconBg="bg-violet-500/10"
      count={events.length}
      loading={isLoading}
      error={isError ? (error as Error) : null}
      empty={events.length === 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {events.map((event: MemoryEvent) => (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <CalendarDays size={16} className="text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
              {event.imageCount != null && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.imageCount} photos</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function TravelSection() {
  const { data: travel = [], isLoading, isError, error } = useTravelMemories()
  return (
    <Section
      title="Travel"
      icon={<MapPin size={15} />}
      iconColor="text-emerald-500"
      iconBg="bg-emerald-500/10"
      count={travel.length}
      loading={isLoading}
      error={isError ? (error as Error) : null}
      empty={travel.length === 0}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {travel.map((t: MemoryTravel) => (
          <div
            key={t.location}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <MapPin size={14} className="text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{t.location}</p>
              {t.imageCount != null && (
                <p className="text-xs text-muted-foreground">{t.imageCount} photos</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function MonthlySection() {
  const [selected, setSelected] = useState<MemoryMonthly | null>(null)
  const { data: months = [], isLoading, isError, error } = useMonthlyMemories()

  function formatMonth(m: string) {
    try {
      return new Date(m).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    } catch {
      return m
    }
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            Memories
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">{formatMonth(selected.month)}</h2>
          </div>
        </div>
        <ImageGrid images={selected.images} />
      </div>
    )
  }

  return (
    <Section
      title="Monthly"
      icon={<Clock size={15} />}
      iconColor="text-rose-500"
      iconBg="bg-rose-500/10"
      count={months.length}
      loading={isLoading}
      error={isError ? (error as Error) : null}
      empty={months.length === 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {months.map((m: MemoryMonthly) => {
          const cover = m.images[0]
          const coverUrl = getThumbnailUrl(cover?.cloudinaryUrl || cover?.url)
          return (
            <button
              key={m.month}
              onClick={() => setSelected(m)}
              className="group relative rounded-xl border border-border bg-card overflow-hidden text-left hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="aspect-video w-full bg-secondary overflow-hidden">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={m.month}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Clock size={24} className="text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{formatMonth(m.month)}</p>
                <p className="text-xs text-muted-foreground">
                  {m.images.length} {m.images.length === 1 ? 'photo' : 'photos'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Documents Section ────────────────────────────────────────────────────────

function DocumentsSection() {
  const { data: documents = [], isLoading, isError, error } = useMemoryDocuments()
  return (
    <Section
      title="Documents"
      icon={<BookOpen size={15} />}
      iconColor="text-orange-500"
      iconBg="bg-orange-500/10"
      count={documents.length}
      loading={isLoading}
      error={isError ? (error as Error) : null}
      empty={documents.length === 0}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {documents.map((doc: MemoryDocument) => (
          <div
            key={doc.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="aspect-[3/2] w-full bg-secondary overflow-hidden">
              {doc.imageUrl ? (
                <img
                  src={doc.imageUrl}
                  alt={doc.title || 'Document'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={22} className="text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-medium text-foreground truncate">
                {doc.title || 'Untitled document'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Memories Page ────────────────────────────────────────────────────────────

export default function MemoriesPage() {
  return (
    <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Memories</h1>
        <p className="text-sm text-muted-foreground">
          AI-curated memories and highlights from your photo library
        </p>
      </div>

      <HighlightsSection />
      <MonthlySection />
      <PeopleSection />
      <EventsMemorySection />
      <TravelSection />
      <DocumentsSection />
    </div>
  )
}
