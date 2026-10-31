import {
  DEFAULT_SETTINGS,
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  type AppSettings,
} from '@/types/settings'

import { isAppearance } from '@/features/workspace/appearance'

const STORAGE_KEY = 'sonnet5-settings'

export function loadSettings(): AppSettings {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}',
    )
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return { ...DEFAULT_SETTINGS }
    const values = parsed as Record<string, unknown>
    const settings = { ...DEFAULT_SETTINGS }
    if (isAppearance(values.theme)) settings.theme = values.theme
    if (
      values.workspaceMode === 'quiet' ||
      values.workspaceMode === 'workspace'
    )
      settings.workspaceMode = values.workspaceMode
    for (const key of ['projectPanelOpen', 'toolsPanelOpen'] as const)
      if (typeof values[key] === 'boolean') settings[key] = values[key]
    if (values.editorFont === 'serif' || values.editorFont === 'sans')
      settings.editorFont = values.editorFont
    if (
      values.writingWidth === 'narrow' ||
      values.writingWidth === 'comfortable' ||
      values.writingWidth === 'wide'
    )
      settings.writingWidth = values.writingWidth
    if (values.storyEditorMode === 'rich' || values.storyEditorMode === 'plain')
      settings.storyEditorMode = values.storyEditorMode
    for (const key of ['aiEnabled', 'onlineExtrasEnabled'] as const)
      if (typeof values[key] === 'boolean') settings[key] = values[key]
    for (const key of ['ollamaEndpoint', 'ollamaModel'] as const)
      if (typeof values[key] === 'string') settings[key] = values[key]
    for (const [key, range] of [
      ['fontSize', FONT_SIZE_RANGE],
      ['lineHeight', LINE_HEIGHT_RANGE],
    ] as const) {
      const value = values[key]
      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= range.min &&
        value <= range.max
      )
        settings[key] = value
    }
    return settings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Settings failure must not take the writing surface down. */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* Writing is persisted separately in IndexedDB. */
  }
}
