import { lazy, Suspense, useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { DictionaryProvider } from '@/engines/DictionaryContext'
import { SettingsProvider } from '@/engines/SettingsContext'
import { useSettings } from '@/engines/useSettings'
import { CommandPaletteProvider } from '@/engines/CommandPaletteContext'
import {
  useCommandPaletteState,
  useRegisterCommands,
  type Command,
} from '@/engines/useCommandPalette'
import { seedLibraryIfNeeded } from '@/db/seedLibrary'
import { createDocument } from '@/db/documents'
import { documentPath, type DocKind } from '@/types/libraryDoc'
import { SaveNotice } from '@/features/SaveNotice'
import { ErrorBoundary } from '@/features/ErrorBoundary'
const LibraryPage = lazy(() =>
  import('@/features/library/LibraryPage').then((module) => ({ default: module.LibraryPage })),
)
const EditorPage = lazy(() =>
  import('@/features/editor/EditorPage').then((module) => ({ default: module.EditorPage })),
)
const HistoryPage = lazy(() =>
  import('@/features/editor/HistoryPage').then((module) => ({ default: module.HistoryPage })),
)
const StoryEditorPage = lazy(() =>
  import('@/features/editor/StoryEditorPage').then((module) => ({
    default: module.StoryEditorPage,
  })),
)
const StoryHistoryPage = lazy(() =>
  import('@/features/editor/StoryHistoryPage').then((module) => ({
    default: module.StoryHistoryPage,
  })),
)
const StatsPage = lazy(() =>
  import('@/features/stats/StatsPage').then((module) => ({ default: module.StatsPage })),
)
import { CommandPalette } from '@/features/commandPalette/CommandPalette'
import { ShortcutsHelp } from '@/features/commandPalette/ShortcutsHelp'

const TrashPage = lazy(() =>
  import('@/features/library/TrashPage').then((module) => ({ default: module.TrashPage })),
)

function WritingRoute({ poem = false }: { poem?: boolean }) {
  const { id } = useParams()
  return poem ? (
    <DictionaryProvider>
      <EditorPage key={id} />
    </DictionaryProvider>
  ) : (
    <StoryEditorPage key={id} />
  )
}

/** Registers the commands available from anywhere in the app — needs to sit
 * inside both the router (for navigation) and the command palette provider. */
function GlobalCommands() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const { setShortcutsOpen } = useCommandPaletteState()

  const commands = useMemo<Command[]>(
    () => [
      ...(['poem', 'story', 'idea'] as DocKind[]).map((kind) => ({
        id: `new-${kind}`,
        label: `New ${kind}`,
        run: () => {
          void createDocument(kind, settings.storyEditorMode).then((doc) =>
            navigate(documentPath(doc)),
          )
        },
      })),
      { id: 'go-trash', label: 'Go to Trash', run: () => navigate('/trash') },
      { id: 'go-library', label: 'Go to Library', run: () => navigate('/') },
      { id: 'go-stats', label: 'Go to Stats', run: () => navigate('/stats') },
      {
        id: 'toggle-theme',
        label: settings.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
        run: () => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' }),
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        shortcut: '?',
        run: () => setShortcutsOpen(true),
      },
    ],
    [navigate, settings.theme, settings.storyEditorMode, updateSettings, setShortcutsOpen],
  )

  useRegisterCommands('global', commands)
  return null
}

export default function App() {
  useEffect(() => {
    void seedLibraryIfNeeded()
  }, [])

  return (
    <SettingsProvider>
      <ErrorBoundary>
        <CommandPaletteProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <SaveNotice />
            <GlobalCommands />
            <CommandPalette />
            <ShortcutsHelp />
            <Suspense
              fallback={
                <p role="status" className="p-8 text-sm text-ink/60">
                  Loading…
                </p>
              }
            >
              <Routes>
                <Route path="/" element={<LibraryPage />} />
                <Route path="/poem/:id" element={<WritingRoute poem />} />
                <Route path="/poem/:id/history" element={<HistoryPage />} />
                <Route path="/story/:id" element={<WritingRoute />} />
                <Route path="/story/:id/history" element={<StoryHistoryPage />} />
                <Route path="/idea/:id" element={<WritingRoute />} />
                <Route path="/idea/:id/history" element={<StoryHistoryPage />} />
                <Route path="/trash" element={<TrashPage />} />
                <Route
                  path="*"
                  element={
                    <p className="p-8">
                      This page was not found.{' '}
                      <Link to="/" className="text-indigo underline">
                        Open your library
                      </Link>
                    </p>
                  }
                />
                <Route path="/stats" element={<StatsPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CommandPaletteProvider>
      </ErrorBoundary>
    </SettingsProvider>
  )
}
