import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatDate(dateStr: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  })
}

export function formatRelative(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(dateStr)
}

export function getImageAspectClass(width: number, height: number): string {
  const ratio = width / height
  if (ratio > 1.5) return 'aspect-video'
  if (ratio < 0.75) return 'aspect-[3/4]'
  return 'aspect-square'
}

export function groupByDate<T extends { uploadedAt?: string; takenAt?: string; date?: string }>(
  items: T[],
  dateKey: keyof T = 'uploadedAt' as keyof T
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const dateStr = item[dateKey] as string
    if (!dateStr) return acc
    const date = new Date(dateStr)
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[label]) acc[label] = []
    acc[label].push(item)
    return acc
  }, {} as Record<string, T[]>)
}