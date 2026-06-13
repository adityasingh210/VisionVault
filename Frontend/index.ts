export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export interface Image {
  id: string
  url: string
  thumbnailUrl?: string
  filename: string
  width: number
  height: number
  size: number
  mimeType: string
  takenAt?: string
  uploadedAt: string
  location?: {
    lat: number
    lng: number
    label?: string
  }
  faces?: string[]
  categories?: string[]
  eventId?: string
  description?: string
  aiTags?: string[]
}

export interface PaginatedImages {
  images: Image[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  imageId?: string
  error?: string
}

// ─── Faces / People ──────────────────────────────────────────────────────────

export interface FaceCluster {
  id: string
  name?: string
  previewUrl: string
  imageCount: number
  thumbnails: string[]
}

export interface FaceClusterDetail extends FaceCluster {
  images: Image[]
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  imageCount: number
  previewUrl: string
  description?: string
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface PhotoEvent {
  id: string
  title: string
  startDate: string
  endDate?: string
  imageCount: number
  previewUrl: string
  location?: string
  thumbnails: string[]
}

export interface PhotoEventDetail extends PhotoEvent {
  images: Image[]
}

export interface MemoryHighlight {
  id: string
  title: string
  imageUrl: string
  date: string
  type: 'highlight'
}

export interface MemoryPerson {
  clusterId: string
  name?: string
  previewUrl: string
  imageCount: number
}

export interface MemoryEvent {
  id: string
  title: string
  date: string
  imageCount: number
  previewUrl: string
}

export interface MemoryDocument {
  id: string
  title: string
  imageUrl: string
  date: string
  type: string
}

export interface MemoryMonthly {
  month: string
  year: number
  imageCount: number
  previews: string[]
}

export interface MemoryTravel {
  id: string
  destination: string
  imageUrl: string
  imageCount: number
  date: string
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  images: Image[]
  total: number
  query: string
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  status: number
  code?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

// ─── UI ──────────────────────────────────────────────────────────────────────

export type ViewMode = 'grid' | 'masonry' | 'list'

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}