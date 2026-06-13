import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { imagesApi, type GetImagesParams } from '@/api/images'
import {
  searchApi,
  facesApi,
  categoriesApi,
  eventsApi,
  memoriesApi,
} from '@/api/services'
import type { Image } from '@/types'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  images: {
    all: (params?: GetImagesParams) => ['images', params] as const,
    infinite: (params?: GetImagesParams) => ['images', 'infinite', params] as const,
    detail: (id: string) => ['images', id] as const,
  },
  search: {
    results: (q: string) => ['search', q] as const,
  },
  faces: {
    clusters: ['faces', 'clusters'] as const,
    cluster: (id: string) => ['faces', 'clusters', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    images: (slug: string) => ['categories', slug, 'images'] as const,
  },
  events: {
    all: ['events'] as const,
    detail: (id: string) => ['events', id] as const,
  },
  memories: {
    highlights: ['memories', 'highlights'] as const,
    people: ['memories', 'people'] as const,
    events: ['memories', 'events'] as const,
    documents: ['memories', 'documents'] as const,
    monthly: ['memories', 'monthly'] as const,
    travel: ['memories', 'travel'] as const,
  },
}

export function useMe(options?: UseQueryOptions<Awaited<ReturnType<typeof authApi.me>>>) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear()
    },
  })
}

export function useImages(params?: GetImagesParams) {
  return useQuery({
    queryKey: queryKeys.images.all(params),
    queryFn: () => imagesApi.getAll(params),
    staleTime: 60_000,
  })
}

export function useInfiniteImages(params?: Omit<GetImagesParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.images.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      imagesApi.getAll({ ...params, page: pageParam as number, pageSize: 30 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60_000,
  })
}

export function useImage(id: string) {
  return useQuery({
    queryKey: queryKeys.images.detail(id),
    queryFn: () => imagesApi.getById(id),
    enabled: !!id,
  })
}

export function useDeleteImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: imagesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['images'] })
    },
  })
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.search.results(q),
    queryFn: () => searchApi.search(q),
    enabled: q.length > 1,
    staleTime: 30_000,
  })
}

export function useFaceClusters() {
  return useQuery({
    queryKey: queryKeys.faces.clusters,
    queryFn: facesApi.getClusters,
    staleTime: 5 * 60_000,
  })
}

export function useFaceCluster(id: string) {
  return useQuery({
    queryKey: queryKeys.faces.cluster(id),
    queryFn: () => facesApi.getCluster(id),
    enabled: !!id,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: categoriesApi.getAll,
    staleTime: 5 * 60_000,
  })
}

export function useCategoryImages(slug: string) {
  return useQuery({
    queryKey: queryKeys.categories.images(slug),
    queryFn: () => categoriesApi.getImages(slug),
    enabled: !!slug,
  })
}

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events.all,
    queryFn: eventsApi.getAll,
    staleTime: 5 * 60_000,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
  })
}

export function useHighlights() {
  return useQuery({
    queryKey: queryKeys.memories.highlights,
    queryFn: memoriesApi.getHighlights,
    staleTime: 10 * 60_000,
  })
}

export function useMemoryPeople() {
  return useQuery({
    queryKey: queryKeys.memories.people,
    queryFn: memoriesApi.getPeople,
  })
}

export function useMemoryEvents() {
  return useQuery({
    queryKey: queryKeys.memories.events,
    queryFn: memoriesApi.getEvents,
  })
}

export function useMemoryDocuments() {
  return useQuery({
    queryKey: queryKeys.memories.documents,
    queryFn: memoriesApi.getDocuments,
  })
}

export function useMonthlyMemories() {
  return useQuery({
    queryKey: queryKeys.memories.monthly,
    queryFn: memoriesApi.getMonthly,
  })
}

export function useTravelMemories() {
  return useQuery({
    queryKey: queryKeys.memories.travel,
    queryFn: memoriesApi.getTravel,
  })
}

export function useUploadImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (n: number) => void }) =>
      imagesApi.upload(file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['images'] })
    },
  })
}

export function useUploadBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ files, onProgress }: { files: File[]; onProgress?: (n: number) => void }) =>
      imagesApi.uploadBatch(files, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['images'] })
    },
  })
}