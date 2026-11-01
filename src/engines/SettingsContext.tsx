import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SettingsContext } from '@/engines/useSettings'
import { loadSettings, saveSettings } from '@/engines/settingsStorage'
import type { AppSettings } from '@/types/settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )
    if (!meta) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = getComputedStyle(
      document.documentElement,
    ).getPropertyValue('--color-paper')
    context.fillRect(0, 0, 1, 1)
    meta.content =
      '#' +
      [...context.getImageData(0, 0, 1, 1).data]
        .slice(0, 3)
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')
  }, [settings.theme])

  const updateSettings = useCallback((changes: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...changes }))
  }, [])
  const value = useMemo(
    () => ({ settings, updateSettings }),
    [settings, updateSettings],
  )
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
