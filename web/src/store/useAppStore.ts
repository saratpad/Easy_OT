import { create } from 'zustand'

interface AppState {
  appName: string
  theme: 'light' | 'dark'
  logoUrl: string | null
  setAppName: (name: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  setLogoUrl: (url: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  appName: 'Overtime Approval System',
  theme: 'light',
  logoUrl: null,
  setAppName: (name) => set({ appName: name }),
  setTheme: (theme) => set({ theme }),
  setLogoUrl: (url) => set({ logoUrl: url }),
}))
