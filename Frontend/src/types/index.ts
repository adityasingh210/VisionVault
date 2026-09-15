export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt?: string
  updatedAt?: string
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

  tokens: {
    accessToken: string
    refreshToken: string
  }
}

export interface Image {
  id: string
  userId?: string
  filename?: string
  originalName?: string
  cloudinaryUrl?: string
  url?: string
  createdAt?: string
  updatedAt?: string
}

export interface PaginatedImages {
  images: Image[]

  pagination: {
    nextCursor: string | null
    hasNextPage: boolean
    count: number
  }
}

export interface SearchResult {
  data: Image[]        
  total?: number
  signals?: string[]
  parsedQuery?: object
}
// Confirmed exact shapes with backend — no more field-name guessing.
export interface FaceCluster {
  id: string
  label?: string | null
  faceCount: number
  representativeImage?: {
    id: string
    cloudinaryUrl: string
    width?: number
    height?: number
  } | null
  createdAt?: string
}

export interface FaceClusterDetail {
  id: string
  label?: string | null
  images: Image[]
}

export interface Category {
  id?: string
  slug: string
  label: string
  imageCount?: number
}

export interface PhotoEvent {
  id: string
  title: string
  imageCount?: number
  startDate?: string
}

export interface PhotoEventDetail extends PhotoEvent {
  images: Image[]
}

// GET /api/memories/highlights returns a single dashboard-style stats
// object (confirmed with backend) — not a list of "highlight cards".
export interface TopCategory {
  slug: string
  label: string
  imageCount: number
}

export interface TopLocation {
  eventId: string
  title: string
  lat: number
  lng: number
  imageCount: number
}

export interface TripCoverImage {
  id: string
  cloudinaryUrl: string
  filename?: string
  takenAt?: string
  width?: number
  height?: number
}

export interface TopTrip {
  eventId: string
  title: string
  startAt?: string
  endAt?: string
  imageCount: number
  coverImage?: TripCoverImage
}

export interface MemoriesOverview {
  totalImages: number
  totalEvents: number
  totalPeople: number
  topCategories: TopCategory[]
  topLocations: TopLocation[]
  topTrips: TopTrip[]
  dateRange: { from: string; to: string }
}

export interface MemoryPerson {
  id: string
  name?: string
  imageCount?: number
}

export interface MemoryEvent {
  id: string
  title: string
  imageCount?: number
}

// GET /api/memories/documents returns documents grouped by type (id,
// certificate, medical, financial, invoice, other), not a flat list.
export interface DocumentImage {
  id: string
  cloudinaryUrl: string
  filename?: string
  takenAt?: string
  width?: number
  height?: number
  ocrConfidence?: number
  categoryConfidence?: number
}

export interface DocumentGroup {
  type: string
  count: number
  images: DocumentImage[]
}

export interface DocumentsOverview {
  totalDocuments: number
  groups: DocumentGroup[]
}

export interface MemoryMonthly {
  month: string
  images: Image[]
}

export interface MemoryTravel {
  location: string
  imageCount?: number
}