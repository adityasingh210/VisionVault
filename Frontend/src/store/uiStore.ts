import { create } from 'zustand'
import type { Image } from '@/types'

interface UIState {
  sidebarOpen: boolean
  commandOpen: boolean
  previewImage: Image | null

  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setCommandOpen: (open: boolean) => void
  toggleCommand: () => void
  setPreviewImage: (image: Image | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandOpen: false,
  previewImage: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setPreviewImage: (image) => set({ previewImage: image }),
}))