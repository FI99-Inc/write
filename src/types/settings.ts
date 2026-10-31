import type { Appearance } from '@/features/workspace/appearance'

export interface AppSettings {
  theme: Appearance
  workspaceMode: 'quiet' | 'workspace'
  projectPanelOpen: boolean
  toolsPanelOpen: boolean
  editorFont: 'serif' | 'sans'
  writingWidth: 'narrow' | 'comfortable' | 'wide'
  fontSize: number
  lineHeight: number
  /** Off by default — the app is fully offline-capable without this. When
   * on, the "Ask AI" workbench tab talks directly to a local Ollama
   * instance the user runs themselves; nothing is sent anywhere else. */
  aiEnabled: boolean
  ollamaEndpoint: string
  ollamaModel: string
  /** Off by default — the spec's one pre-approved exception to "no external
   * services": a free, keyless lookup against the Datamuse API to
   * supplement the bundled CMU dictionary / Moby Thesaurus. The app works
   * fully offline without it. */
  onlineExtrasEnabled: boolean
  /** Which editor new stories open in. 'rich' (default) uses the TipTap
   * formatting surface; 'plain' restores the original textarea. Each story
   * records its own format at creation, so this only affects new stories. */
  storyEditorMode: 'rich' | 'plain'
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'olive',
  workspaceMode: 'workspace',
  projectPanelOpen: true,
  toolsPanelOpen: true,
  editorFont: 'serif',
  writingWidth: 'comfortable',
  fontSize: 20,
  lineHeight: 36,
  aiEnabled: false,
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: '',
  onlineExtrasEnabled: false,
  storyEditorMode: 'rich',
}

export const FONT_SIZE_RANGE = { min: 14, max: 24, step: 1 }
export const LINE_HEIGHT_RANGE = { min: 24, max: 44, step: 2 }
