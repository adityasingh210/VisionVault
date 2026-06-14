import { api } from './client'
import type { Image } from '@/types'

export interface GetImagesParams {
  cursor?: string
  limit?: number
  status?: string
  source?: 'LOCAL' | 'GOOGLE_PHOTOS'
  sort?: 'date' | 'name' | 'size'
  order?: 'asc' | 'desc'
}

export interface ImagesResponse {
  images: Image[]
  pagination: {
    nextCursor: string | null
    hasNextPage: boolean
    count: number
  }
}

export const imagesApi = {
  getAll: async (params: GetImagesParams = {}): Promise<ImagesResponse> => {
    const { data } = await api.get('/images', { params })
    return data
  },

  getById: async (id: string): Promise<Image> => {
    const { data } = await api.get(`/images/${id}`)
    return data
  },

  upload: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Image> => {
    const formData = new FormData()
    formData.append('image', file)

    // 🔥 Interceptor khud Authorization header jod dega, hume sirf Content-Type batana hai
    const { data } = await api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return data
  },

  uploadBatch: async (
    files: File[],
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData()

    files.forEach((f) => {
      formData.append('images', f) // Backend array key 'images' check karega
    })

    // 🔥 Yahan bhi headers ko interceptor par chhod do, pure layout ko safely handle karega
    const { data } = await api.post('/images/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return data
  },

  delete: async (id: string) => {
    await api.delete(`/images/${id}`)
  },
}