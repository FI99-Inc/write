import { describe, it, expect, beforeEach } from 'vitest'
import { loadSettings, saveSettings } from '@/engines/settingsStorage'
import { DEFAULT_SETTINGS } from '@/types/settings'

beforeEach(() => {
  localStorage.clear()
})

describe('loadSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('returns saved settings after saveSettings', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      theme: 'dark' as const,
      editorFont: 'sans' as const,
      fontSize: 20,
      lineHeight: 36,
    }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it('fills in missing fields from a partially-saved older shape', () => {
    localStorage.setItem('sonnet5-settings', JSON.stringify({ theme: 'dark' }))
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
  })

  it('falls back to defaults for corrupt stored data', () => {
    localStorage.setItem('sonnet5-settings', 'not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('defaults storyEditorMode to rich', () => {
    expect(loadSettings().storyEditorMode).toBe('rich')
  })

  it('preserves a saved storyEditorMode of plain', () => {
    saveSettings({ ...DEFAULT_SETTINGS, storyEditorMode: 'plain' })
    expect(loadSettings().storyEditorMode).toBe('plain')
  })
})

describe('workspace appearance preferences', () => {
  it('preserves old Light/Dark and writing metrics when extending settings', () => {
    localStorage.setItem(
      'sonnet5-settings',
      JSON.stringify({ theme: 'light', fontSize: 18, lineHeight: 32 }),
    )
    expect(loadSettings()).toMatchObject({
      theme: 'light',
      fontSize: 18,
      lineHeight: 32,
      workspaceMode: 'workspace',
    })
  })
  it.each(['olive', 'dusk', 'sand', 'light', 'dark'] as const)(
    'round trips %s without affecting writing preferences',
    (theme) => {
      saveSettings({
        ...DEFAULT_SETTINGS,
        theme,
        workspaceMode: 'quiet',
        toolsPanelOpen: false,
        writingWidth: 'wide',
      })
      expect(loadSettings()).toMatchObject({
        theme,
        workspaceMode: 'quiet',
        toolsPanelOpen: false,
        writingWidth: 'wide',
      })
    },
  )
  it('rejects corrupt appearance and panel preferences independently', () => {
    localStorage.setItem(
      'sonnet5-settings',
      JSON.stringify({
        theme: 'unknown',
        workspaceMode: true,
        toolsPanelOpen: 'yes',
        fontSize: 21,
      }),
    )
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, fontSize: 21 })
  })
})
