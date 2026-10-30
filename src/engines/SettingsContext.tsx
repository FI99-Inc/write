import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SettingsContext } from '@/engines/useSettings'
import { loadSettings, saveSettings } from '@/engines/settingsStorage'
import type { AppSettings } from '@/types/settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    saveSettings(settings)
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings])

  const updateSettings = useCallback((changes: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...changes }))
  }, [])
  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
