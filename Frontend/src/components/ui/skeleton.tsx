import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('skeleton', className)} {...props} />
}

export function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-muted', className)}>
      <Skeleton className="w-full h-full" />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export function GalleryGridSkeleton({ count = 12 }: { count?: number }) {
  const heights = ['h-48', 'h-56', 'h-40', 'h-64', 'h-44', 'h-52']
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-2 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-2">
          <Skeleton className={cn('w-full rounded-xl', heights[i % heights.length])} />
        </div>
      ))}
    </div>
  )
}