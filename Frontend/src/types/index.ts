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
export interface FaceCluster {
  id: string
  label?: string
  count?: number
}

export interface FaceClusterDetail {
  id: string
  label?: string
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

export interface MemoryHighlight {
  id: string
  title: string
  images: Image[]
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

export interface MemoryDocument {
  id: string
  title?: string
  imageUrl?: string
}

export interface MemoryMonthly {
  month: string
  images: Image[]
}

export interface MemoryTravel {
  location: string
  imageCount?: number
}