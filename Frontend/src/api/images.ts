import { api } from './client'
import type { Image, PaginatedImages } from '@/types'

export interface GetImagesParams {
  page?: number
  pageSize?: number
  category?: string
  eventId?: string
  sort?: 'date' | 'name' | 'size'
  order?: 'asc' | 'desc'
}

export const imagesApi = {
  getAll: async (params: GetImagesParams = {}): Promise<PaginatedImages> => {
    const { data } = await api.get<PaginatedImages>('/images', { params })
    return data
  },

  getById: async (id: string): Promise<Image> => {
    const { data } = await api.get<{ image: Image }>(`/images/${id}`)
    return data.image
  },

  upload: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Image> => {
    const formData = new FormData()
    formData.append('image', file)

    const { data } = await api.post<{ image: Image }>('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
    return data.image
  },

  uploadBatch: async (
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<Image[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))

    const { data } = await api.post<{ images: Image[] }>('/images/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
    return data.images
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/images/${id}`)
  },
}