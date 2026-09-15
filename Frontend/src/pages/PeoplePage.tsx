import { useState } from 'react'
import { getThumbnailUrl } from '@/lib/cloudinary'
import {
  Users,
  ChevronLeft,
  ImageIcon,
  ZoomIn,
  X,
  User,
  Pencil,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'
import { useFaceClusters, useFaceCluster } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import type { FaceCluster, Image } from '@/types'

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
  const url = img?.cloudinaryUrl || img?.url || ''

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

function PersonCard({
  cluster,
  onClick,
}: {
  cluster: FaceCluster
  onClick: () => void
}) {
  // Confirmed exact backend shape: `faceCount` and `representativeImage.cloudinaryUrl`
  // — no other field-name aliases exist, so read them directly.
  const thumbnail = cluster.representativeImage?.cloudinaryUrl
    ? getThumbnailUrl(cluster.representativeImage.cloudinaryUrl)
    : null
  const name = cluster.label || 'Unknown Person'
  const count = cluster.faceCount ?? 0

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-surface-1 border border-border hover:border-primary/40 hover:bg-surface-2 transition-all duration-200 text-left w-full"
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-2 ring-2 ring-border group-hover:ring-primary/40 transition-all duration-200">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={32} className="text-muted-foreground" />
            </div>
          )}
        </div>
        {/* Photo count badge */}
        {count > 0 && (
          <div className="absolute -bottom-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {count === 0 ? 'No photos' : count === 1 ? '1 photo' : `${count} photos`}
        </p>
      </div>
    </button>
  )
}

function PersonDetail({
  clusterId,
  onBack,
}: {
  clusterId: string
  onBack: () => void
}) {
  const { data, isLoading, isError, error } = useFaceCluster(clusterId)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const name = data?.label || 'Unknown Person'
  const images = data?.images ?? []

  return (
    <div>
      {/* Back header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isLoading ? (
            <Skeleton className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-2 ring-2 ring-border shrink-0">
              {data?.images?.[0]?.cloudinaryUrl || data?.images?.[0]?.url ? (
                <img
                  src={getThumbnailUrl(data.images[0].cloudinaryUrl || data.images[0].url)}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={18} className="text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-32 mb-1" />
            ) : (
              <h2 className="text-lg font-semibold text-foreground truncate">{name}</h2>
            )}
            {!isLoading && !isError && (
              <p className="text-xs text-muted-foreground">
                {images.length === 0 ? 'No photos' : images.length === 1 ? '1 photo' : `${images.length} photos`}
              </p>
            )}
          </div>
        </div>
        {!isLoading && !isError && (
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
            <Pencil size={13} />
            Rename
          </Button>
        )}
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
          description="No photos have been linked to this person yet."
        />
      )}

      {/* Photos grid */}
      {!isLoading && !isError && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {images.map((img, i) => {
            const url  = getThumbnailUrl(img.cloudinaryUrl || img.url)
            return (
              <div
                key={img.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-surface-2 cursor-pointer"
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

export default function PeoplePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: clusters, isLoading, isError, error } = useFaceClusters()

  // Cluster detail view
  if (selectedId) {
    return (
      <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto">
        <PersonDetail clusterId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">People</h1>
          <p className="text-sm text-muted-foreground">
            Faces automatically grouped by AI face clustering
          </p>
        </div>
        {!isLoading && !isError && clusters && clusters.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {clusters.length} {clusters.length === 1 ? 'person' : 'people'}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3 p-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
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
          <h3 className="text-base font-semibold text-foreground mb-1">Failed to load people</h3>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && (!clusters || clusters.length === 0) && (
        <EmptyState
          icon={Users}
          title="No people found"
          description="Upload photos with faces and the AI will automatically group them by person."
        />
      )}

      {/* People grid */}
      {!isLoading && !isError && clusters && clusters.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {clusters.map((cluster) => (
            <PersonCard
              key={cluster.id}
              cluster={cluster}
              onClick={() => setSelectedId(cluster.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}