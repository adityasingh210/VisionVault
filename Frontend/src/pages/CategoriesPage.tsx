import { useState } from 'react'
import { getThumbnailUrl } from '@/lib/cloudinary'
import {
  FolderOpen,
  ChevronLeft,
  ImageIcon,
  ZoomIn,
  X,
  AlertCircle,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'
import { useCategories, useCategoryImages } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import type { Category, Image } from '@/types'

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
  const url = getThumbnailUrl(img.cloudinaryUrl || img.url)

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

function CategoryCard({
  category,
  onClick,
}: {
  category: Category
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 text-left"
    >
      {/* Thumbnail */}
      <div className="aspect-video w-full bg-secondary overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          <Tag size={32} className="text-muted-foreground/40" />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground capitalize truncate">
            {category.label}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {category.imageCount != null
              ? `${category.imageCount} ${category.imageCount === 1 ? 'photo' : 'photos'}`
              : 'Browse photos'}
          </p>
        </div>
        <div className="shrink-0 w-7 h-7 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <ChevronLeft size={14} className="text-muted-foreground rotate-180 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  )
}

function CategoryDetail({
  category,
  onBack,
}: {
  category: Category
  onBack: () => void
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const { data: images = [], isLoading, isError, error } = useCategoryImages(category.slug)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Tag size={16} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground capitalize truncate">
              {category.label}
            </h2>
            {!isLoading && !isError && (
              <p className="text-xs text-muted-foreground">
                {images.length === 0
                  ? 'No photos'
                  : images.length === 1
                  ? '1 photo'
                  : `${images.length} photos`}
              </p>
            )}
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
          description="No photos have been tagged with this category yet."
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

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const { data: categories, isLoading, isError, error } = useCategories()

  if (selectedCategory) {
    return (
      <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto">
        <CategoryDetail
          category={selectedCategory}
          onBack={() => setSelectedCategory(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-full p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Categories</h1>
          <p className="text-sm text-muted-foreground">
            AI-generated categories based on photo content
          </p>
        </div>
        {!isLoading && !isError && categories && categories.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
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
          <h3 className="text-base font-semibold text-foreground mb-1">Failed to load categories</h3>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && (!categories || categories.length === 0) && (
        <EmptyState
          icon={FolderOpen}
          title="No categories yet"
          description="Upload photos and the AI will automatically categorize them by content."
        />
      )}

      {/* Grid */}
      {!isLoading && !isError && categories && categories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              onClick={() => setSelectedCategory(category)}
            />
          ))}
        </div>
      )}
    </div>
  )
}