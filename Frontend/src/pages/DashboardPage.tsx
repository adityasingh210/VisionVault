import { useNavigate } from 'react-router-dom'
import { getThumbnailUrl } from '@/lib/cloudinary'
import {
  Images,
  FolderOpen,
  Users,
  CalendarDays,
  Search,
  Upload,
  Brain,
  ScanFace,
  Sparkles,
  Clock,
  ArrowRight,
  TrendingUp,
  Zap,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useImages, useCategories, useFaceClusters, useEvents } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import type { Image } from '@/types'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  loading?: boolean
  color?: string
  onClick?: () => void
}

function StatCard({ icon, label, value, sub, loading, color = 'text-primary', onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left',
        'hover:border-primary/30 hover:bg-card/80 transition-all duration-200',
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg bg-secondary', color)}>
          {icon}
        </div>
        {onClick && (
          <ArrowRight
            size={14}
            className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150"
          />
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      ) : (
        <div>
          <div className="text-2xl font-semibold text-foreground tabular-nums">{value}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
          {sub && <div className="text-xs text-muted-foreground/70 mt-1">{sub}</div>}
        </div>
      )}
    </button>
  )
}

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  description: string
  color: string
  bgColor: string
  onClick?: () => void
  badge?: string
}

function QuickAction({ icon, label, description, color, bgColor, onClick, badge }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 text-left w-full',
        'hover:border-primary/30 hover:bg-card/80 transition-all duration-200'
      )}
    >
      <div className={cn('p-2 rounded-lg shrink-0', bgColor, color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {badge && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight
        size={14}
        className="text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150"
      />
    </button>
  )
}

function PhotoThumb({ image }: { image: Image }) {
  const url = getThumbnailUrl(image.cloudinaryUrl || image.url)
  return (
    <div className="aspect-square rounded-lg overflow-hidden bg-secondary border border-border">
      {url ? (
        <img
          src={url}
          alt={image.originalName || image.filename || 'Photo'}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Images size={18} className="text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

interface StatusItemProps {
  icon: React.ReactNode
  label: string
  status: 'done' | 'processing' | 'idle'
  detail?: string
}

function StatusItem({ icon, label, status, detail }: StatusItemProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
      <div className="shrink-0">
        {status === 'done' && <CheckCircle2 size={15} className="text-emerald-400" />}
        {status === 'processing' && <Loader2 size={15} className="text-primary animate-spin" />}
        {status === 'idle' && <AlertCircle size={15} className="text-muted-foreground/50" />}
      </div>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setCommandOpen } = useUIStore()

  const { data: imagesData, isLoading: imagesLoading } = useImages({ limit: 12 })
  const { data: categories, isLoading: catsLoading } = useCategories()
  const { data: clusters, isLoading: clustersLoading } = useFaceClusters()
  const { data: events, isLoading: eventsLoading } = useEvents()

  const totalPhotos = imagesData?.pagination.count ?? 0
  const recentPhotos = imagesData?.images?.slice(0, 8) ?? []
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">

      {/* ── Welcome Banner ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 lg:p-8">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                AI-powered
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
              Your photo library is organized and ready. Explore your memories, find people, or upload new photos.
            </p>
          </div>

          {/* Search Entry Point */}
          <button
            onClick={() => setCommandOpen(true)}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-border bg-background/50 backdrop-blur px-4 py-3',
              'hover:border-primary/40 hover:bg-background/80 transition-all duration-200',
              'min-w-[220px] text-left group shrink-0'
            )}
          >
            <Search size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground flex-1">Search your photos…</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Images size={18} />}
          label="Total photos"
          value={imagesLoading ? '—' : totalPhotos.toLocaleString()}
          sub={totalPhotos > 0 ? `Across your library` : 'Start uploading'}
          loading={imagesLoading}
          color="text-primary"
          onClick={() => navigate('/gallery')}
        />
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Categories"
          value={catsLoading ? '—' : (categories?.length ?? 0)}
          sub="AI-detected scenes"
          loading={catsLoading}
          color="text-gold-400"
          onClick={() => navigate('/categories')}
        />
        <StatCard
          icon={<Users size={18} />}
          label="People"
          value={clustersLoading ? '—' : (clusters?.length ?? 0)}
          sub="Recognized faces"
          loading={clustersLoading}
          color="text-sky-400"
          onClick={() => navigate('/people')}
        />
        <StatCard
          icon={<CalendarDays size={18} />}
          label="Events"
          value={eventsLoading ? '—' : (events?.length ?? 0)}
          sub="Detected automatically"
          loading={eventsLoading}
          color="text-emerald-400"
          onClick={() => navigate('/events')}
        />
      </div>

      {/* ── Main Grid: Recent Uploads + Quick Actions + Status ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Uploads — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent uploads</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your latest additions</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => navigate('/gallery')}
            >
              View all
              <ArrowRight size={12} />
            </Button>
          </div>

          {imagesLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : recentPhotos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <Upload size={20} className="text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground">No photos yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Upload your first photos to get started
              </p>
              <Button size="sm" onClick={() => navigate('/upload')}>
                <Upload size={13} className="mr-1.5" />
                Upload photos
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {recentPhotos.map((img) => (
                  <PhotoThumb key={img.id} image={img} />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-xs text-muted-foreground">
                  {totalPhotos} photos in your library
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right column: Quick Actions + Status */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Quick actions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Jump to key features</p>
            </div>
            <div className="space-y-2">
              <QuickAction
                icon={<Upload size={16} />}
                label="Upload photos"
                description="Add new photos to your library"
                color="text-primary"
                bgColor="bg-primary/10"
                onClick={() => navigate('/upload')}
              />
              <QuickAction
                icon={<Search size={16} />}
                label="Semantic search"
                description="Search by what's in the photo"
                color="text-gold-400"
                bgColor="bg-gold-500/10"
                badge="AI"
                onClick={() => setCommandOpen(true)}
              />
              <QuickAction
                icon={<ScanFace size={16} />}
                label="Browse people"
                description="Photos organized by face"
                color="text-sky-400"
                bgColor="bg-sky-500/10"
                onClick={() => navigate('/people')}
              />
              <QuickAction
                icon={<Brain size={16} />}
                label="Memories"
                description="AI-curated highlights"
                color="text-emerald-400"
                bgColor="bg-emerald-500/10"
                badge="New"
                onClick={() => navigate('/memories')}
              />
            </div>
          </div>

          {/* Processing Status */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Processing status</h3>
            </div>
            <StatusItem
              icon={<ScanFace size={14} />}
              label="Face recognition"
              status={clusters && clusters.length > 0 ? 'done' : 'idle'}
              detail={clusters && clusters.length > 0 ? `${clusters.length} people identified` : 'Upload photos to begin'}
            />
            <StatusItem
              icon={<FolderOpen size={14} />}
              label="Auto-categorization"
              status={categories && categories.length > 0 ? 'done' : 'idle'}
              detail={categories && categories.length > 0 ? `${categories.length} categories found` : 'Awaiting photos'}
            />
            <StatusItem
              icon={<CalendarDays size={14} />}
              label="Event detection"
              status={events && events.length > 0 ? 'done' : 'idle'}
              detail={events && events.length > 0 ? `${events.length} events grouped` : 'Awaiting photos'}
            />
            <StatusItem
              icon={<Clock size={14} />}
              label="OCR indexing"
              status="idle"
              detail="Text in photos searchable"
            />
          </div>
        </div>
      </div>

      {/* ── AI Features Banner ──────────────────────────────────────────── */}
      {totalPhotos === 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
              <Brain size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                VisionVault is ready to analyze your photos
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Upload photos and our AI will automatically detect faces, categorize scenes,
                group events, read text, find duplicates, and create memories — all in the background.
              </p>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => navigate('/upload')}>
              Get started
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}