import { createContext, useContext } from 'react'
import type { AppSettings } from '@/types/settings'

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (changes: Partial<AppSettings>) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within a SettingsProvider')
  return context
}
