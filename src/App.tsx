import { lazy, Suspense, useEffect, useMemo } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  Link,
} from 'react-router-dom'
import { DictionaryProvider } from '@/engines/DictionaryContext'
import { SettingsProvider } from '@/engines/SettingsContext'
import { useSettings } from '@/engines/useSettings'
import { APPEARANCES } from '@/features/workspace/appearance'
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
import { BackupScheduler } from '@/features/backups/BackupScheduler'
const BackupsPage = lazy(() =>
  import('@/features/backups/BackupsPage').then((module) => ({
    default: module.BackupsPage,
  })),
)
const ProjectsPage = lazy(() =>
  import('@/features/projects/ProjectsPage').then((module) => ({
    default: module.ProjectsPage,
  })),
)
const LibraryPage = lazy(() =>
  import('@/features/library/LibraryPage').then((module) => ({
    default: module.LibraryPage,
  })),
)
const EditorPage = lazy(() =>
  import('@/features/editor/EditorPage').then((module) => ({
    default: module.EditorPage,
  })),
)
const HistoryPage = lazy(() =>
  import('@/features/editor/HistoryPage').then((module) => ({
    default: module.HistoryPage,
  })),
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
  import('@/features/stats/StatsPage').then((module) => ({
    default: module.StatsPage,
  })),
)
import { CommandPalette } from '@/features/commandPalette/CommandPalette'
import { ShortcutsHelp } from '@/features/commandPalette/ShortcutsHelp'

const TrashPage = lazy(() =>
  import('@/features/library/TrashPage').then((module) => ({
    default: module.TrashPage,
  })),
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
      {
        id: 'go-backups',
        label: 'Go to Backups',
        run: () => navigate('/backups'),
      },
      {
        id: 'go-projects',
        label: 'Go to Projects',
        run: () => navigate('/projects'),
      },
      { id: 'go-trash', label: 'Go to Trash', run: () => navigate('/trash') },
      { id: 'go-library', label: 'Go to Library', run: () => navigate('/') },
      {
        id: 'find-library',
        label: 'Find writing in the library',
        run: () => navigate('/?find=1'),
      },
      { id: 'go-stats', label: 'Go to Stats', run: () => navigate('/stats') },
      {
        id: 'toggle-theme',
        label: 'Switch between Light and Dark',
        run: () =>
          updateSettings({
            theme: APPEARANCES.find((option) => option.value === settings.theme)
              ?.dark
              ? 'light'
              : 'dark',
          }),
      },
      ...APPEARANCES.map((option) => ({
        id: `appearance-${option.value}`,
        label: `Appearance: ${option.label}`,
        run: () => updateSettings({ theme: option.value }),
      })),
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        shortcut: '?',
        run: () => setShortcutsOpen(true),
      },
    ],
    [
      navigate,
      settings.theme,
      settings.storyEditorMode,
      updateSettings,
      setShortcutsOpen,
    ],
  )

  useRegisterCommands('global', commands)
  return null
}

const UIPrototype = import.meta.env.DEV
  ? lazy(() => import('@/features/prototype/UIPrototype'))
  : null

export default function App() {
  if (
    UIPrototype &&
    window.location.pathname.replace(/\/$/, '') === '/prototype/ui'
  ) {
    return (
      <Suspense fallback={<p role="status">Opening interface studies…</p>}>
        <UIPrototype />
      </Suspense>
    )
  }
  return <WritingApp />
}

function WritingApp() {
  useEffect(() => {
    void seedLibraryIfNeeded()
  }, [])

  return (
    <SettingsProvider>
      <ErrorBoundary>
        <CommandPaletteProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <SaveNotice />
            <BackupScheduler />
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
                <Route
                  path="/story/:id/history"
                  element={<StoryHistoryPage />}
                />
                <Route path="/idea/:id" element={<WritingRoute />} />
                <Route
                  path="/idea/:id/history"
                  element={<StoryHistoryPage />}
                />
                <Route path="/backups" element={<BackupsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectsPage />} />
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
