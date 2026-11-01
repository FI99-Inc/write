import { useRef, useState, type ChangeEvent } from 'react'
import {
  exportLibrary,
  importLibrary,
  type LibraryExportData,
  type ImportResult,
} from '@/db/libraryExport'
import { useModalFocus } from '@/engines/useModalFocus'
import { parseLibraryExport } from '@/db/validateLibrary'
import { downloadJson } from '@/features/library/downloadJson'

function describeImport(result: ImportResult): string {
  const items: [number, string, string][] = [
    [result.projectsAdded, 'project', 'projects'],
    [result.poemsAdded, 'poem', 'poems'],
    [result.storiesAdded, 'story', 'stories'],
    [result.ideasAdded, 'idea', 'ideas'],
    [result.collectionsAdded, 'collection', 'collections'],
    [result.snapshotsAdded, 'snapshot', 'snapshots'],
    [result.customFormsAdded, 'custom form', 'custom forms'],
    [result.wordOverridesAdded, 'word correction', 'word corrections'],
  ]
  const summary = items
    .filter(([count]) => count > 0)
    .map(([count, singular, plural]) => `${count} ${count === 1 ? singular : plural}`)
    .join(', ')
  return summary ? `Imported ${summary}.` : 'No new library items were added.'
}

export function ImportExportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<LibraryExportData | null>(null)
  const [lastResult, setLastResult] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const importing = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  useModalFocus(dialogRef, pendingImport !== null, () => {
    if (!importing.current) setPendingImport(null)
  })
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setError(null)
    try {
      const data = await exportLibrary()
      downloadJson(data, `write-library-${new Date().toISOString().slice(0, 10)}.json`)
    } catch {
      setError('Could not export your library. Please try again.')
    }
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onerror = () => setError('Could not read this file.')
    reader.onload = async () => {
      try {
        setPendingImport(await parseLibraryExport(JSON.parse(reader.result as string)))
      } catch {
        setError("That file doesn't look like a WR!TE library export.")
      }
    }
    reader.readAsText(file)
  }

  async function confirmImport() {
    if (!pendingImport || importing.current) return
    importing.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await importLibrary(pendingImport)
      setLastResult(result)
      setPendingImport(null)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not import this library. Existing writing has been kept.',
      )
    } finally {
      importing.current = false
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4 text-sm text-ink/50">
      {/* "library" is implied by the context on a phone, and dropping it is
       * what keeps the header's first row to a single line. */}
      <button type="button" onClick={handleExport} className="header-action">
        Export<span className="hidden sm:inline"> library</span>
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()} className="header-action">
        Import<span className="hidden sm:inline"> library</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileSelected}
        className="hidden"
      />

      {error && (
        <span role="alert" className="text-berry">
          {error}
        </span>
      )}

      {pendingImport && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4 bg-ink/20">
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Import library"
            className="w-full max-w-sm rounded-lg border border-canvas-line bg-paper p-5 text-sm shadow-lg"
          >
            <p className="font-display text-lg text-ink">Import this library file?</p>
            <p className="mt-2 text-ink/60">
              This will add {(pendingImport.projects ?? []).length} project
              {(pendingImport.projects ?? []).length === 1 ? '' : 's'}, {pendingImport.poems.length}{' '}
              poem
              {pendingImport.poems.length === 1 ? '' : 's'},{' '}
              {pendingImport.stories.filter((doc) => doc.kind !== 'idea').length} stories,{' '}
              {pendingImport.stories.filter((doc) => doc.kind === 'idea').length} ideas,{' '}
              {pendingImport.collections.length} collection
              {pendingImport.collections.length === 1 ? '' : 's'}, and{' '}
              {pendingImport.snapshots.length} snapshot
              {pendingImport.snapshots.length === 1 ? '' : 's'} alongside what you already have.
              Ideas and Trash are included. Nothing existing will be overwritten — anything with a
              clashing id is added as a copy instead.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-berry">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="text-ink/50 hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmImport}
                className="rounded-full bg-indigo px-4 py-1.5 font-medium text-paper hover:bg-indigo-soft"
              >
                {busy ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lastResult && (
        <span role="status" className="text-verdigris">
          {describeImport(lastResult)}
        </span>
      )}
    </div>
  )
}
