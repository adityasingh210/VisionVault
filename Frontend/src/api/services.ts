import { api } from './client'
import type {
  SearchResult,
  FaceCluster,
  FaceClusterDetail,
  Category,
  Image,
  PhotoEvent,
  PhotoEventDetail,
  MemoriesOverview,
  MemoryPerson,
  MemoryEvent,
  DocumentsOverview,
  MemoryMonthly,
  MemoryTravel,
} from '@/types'

export const searchApi = {
  search: async (q: string): Promise<SearchResult> => {
    const { data } = await api.get<SearchResult>('/search', { params: { q } })
    return data
  },
}

export const facesApi = {
  // Confirmed shape: { clusters: [{ id, label, faceCount, representativeImage, createdAt }] }
  getClusters: async (): Promise<FaceCluster[]> => {
    const { data } = await api.get<{ clusters: FaceCluster[] }>('/faces/clusters')
    return data.clusters
  },

  getCluster: async (id: string): Promise<FaceClusterDetail> => {
    // Backend returns the cluster object directly — { id, label, createdAt, faces }
    // — not wrapped in { cluster: ... }. `faces` is an array of face-detection
    // records (bbox + nested `image`), not photos directly, so pull the image
    // out of each face for the photo grid.
    const { data } = await api.get<{
      id: string
      label?: string | null
      createdAt?: string
      faces: { id: string; image: Image }[]
    }>(`/faces/clusters/${id}`)
    return { id: data.id, label: data.label, images: data.faces.map((f) => f.image) }
  },
}

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get<{ categories: Category[] }>('/categories')
    return data.categories
  },

  getImages: async (slug: string): Promise<Image[]> => {
    const { data } = await api.get<{ images: Image[] }>(`/categories/${slug}/images`)
    return data.images
  },
}
export const eventsApi = {
  getAll: async (): Promise<PhotoEvent[]> => {
    const { data } = await api.get<{ events: PhotoEvent[] }>('/events')
    return data.events
  },

  getById: async (id: string): Promise<PhotoEventDetail> => {
    const { data } = await api.get<{ event: PhotoEventDetail }>(`/events/${id}`)
    return data.event
  },

  rebuild: async (): Promise<void> => {
    await api.post('/events/rebuild')
  },
}

// /memories/people, /events, /monthly, /travel wrap their payload as
// { data: [...], total? } — but that isn't guaranteed to always be an array
// (highlights/documents already turned out not to be), so keep this guard
// for these too.
function toArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export const memoriesApi = {
  // Single dashboard-style stats object, not an array — see MemoriesOverview.
  getHighlights: async (): Promise<MemoriesOverview> => {
    const { data } = await api.get<{ data: MemoriesOverview }>('/memories/highlights')
    return data.data
  },

  getPeople: async (): Promise<MemoryPerson[]> => {
    const { data } = await api.get<{ data: MemoryPerson[] | MemoryPerson }>('/memories/people')
    return toArray(data.data)
  },

  getEvents: async (): Promise<MemoryEvent[]> => {
    const { data } = await api.get<{ data: MemoryEvent[] | MemoryEvent }>('/memories/events')
    return toArray(data.data)
  },

  // Grouped by document type, not a flat array — see DocumentsOverview.
  getDocuments: async (): Promise<DocumentsOverview> => {
    const { data } = await api.get<{ data: DocumentsOverview }>('/memories/documents')
    return data.data
  },

  getMonthly: async (): Promise<MemoryMonthly[]> => {
    const { data } = await api.get<{ data: MemoryMonthly[] | MemoryMonthly }>('/memories/monthly')
    return toArray(data.data)
  },

  getTravel: async (): Promise<MemoryTravel[]> => {
    const { data } = await api.get<{ data: MemoryTravel[] | MemoryTravel }>('/memories/travel')
    return toArray(data.data)
  },
}