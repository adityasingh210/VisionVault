import { api } from './client'
import type {
  SearchResult,
  FaceCluster,
  FaceClusterDetail,
  Category,
  Image,
  PhotoEvent,
  PhotoEventDetail,
  MemoryHighlight,
  MemoryPerson,
  MemoryEvent,
  MemoryDocument,
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
  getClusters: async (): Promise<FaceCluster[]> => {
    const { data } = await api.get<{ clusters: FaceCluster[] }>('/faces/clusters')
    return data.clusters
  },

  getCluster: async (id: string): Promise<FaceClusterDetail> => {
    const { data } = await api.get<{ cluster: FaceClusterDetail }>(`/faces/clusters/${id}`)
    return data.cluster
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

export const memoriesApi = {
  getHighlights: async (): Promise<MemoryHighlight[]> => {
    const { data } = await api.get<{ highlights: MemoryHighlight[] }>('/memories/highlights')
    return data.highlights
  },

  getPeople: async (): Promise<MemoryPerson[]> => {
    const { data } = await api.get<{ people: MemoryPerson[] }>('/memories/people')
    return data.people
  },

  getEvents: async (): Promise<MemoryEvent[]> => {
    const { data } = await api.get<{ events: MemoryEvent[] }>('/memories/events')
    return data.events
  },

  getDocuments: async (): Promise<MemoryDocument[]> => {
    const { data } = await api.get<{ documents: MemoryDocument[] }>('/memories/documents')
    return data.documents
  },

  getMonthly: async (): Promise<MemoryMonthly[]> => {
    const { data } = await api.get<{ months: MemoryMonthly[] }>('/memories/monthly')
    return data.months
  },

  getTravel: async (): Promise<MemoryTravel[]> => {
    const { data } = await api.get<{ travel: MemoryTravel[] }>('/memories/travel')
    return data.travel
  },
}