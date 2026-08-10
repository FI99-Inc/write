import { useRef, useState, type ChangeEvent } from 'react'
import { exportLibrary, importLibrary, type LibraryExportData, type ImportResult } from '@/db/libraryExport'
import { downloadJson } from '@/features/library/downloadJson'

export function ImportExportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<LibraryExportData | null>(null)
  const [lastResult, setLastResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    const data = await exportLibrary()
    downloadJson(data, `write-library-${new Date().toISOString().slice(0, 10)}.json`)
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as LibraryExportData
        if (!Array.isArray(data.poems)) throw new Error('Not a WR!TE library file.')
        setPendingImport(data)
      } catch {
        setError('That file doesn\'t look like a WR!TE library export.')
      }
    }
    reader.readAsText(file)
  }

  async function confirmImport() {
    if (!pendingImport) return
    const result = await importLibrary(pendingImport)
    setLastResult(result)
    setPendingImport(null)
  }

  return (
    <div className="flex items-center gap-2 text-xs text-ink/50">
      {/* "library" is implied by the context on a phone, and dropping it is
       * what keeps the header's first row to a single line. */}
      <button type="button" onClick={handleExport} className="hover:text-indigo">
        Export<span className="hidden sm:inline"> library</span>
      </button>
      <span className="text-canvas-line">|</span>
      <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-indigo">
        Import<span className="hidden sm:inline"> library</span>
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />

      {error && <span className="text-berry">{error}</span>}

      {pendingImport && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4 bg-ink/20">
          <div className="w-full max-w-sm rounded-lg border border-canvas-line bg-paper p-5 text-sm shadow-lg">
            <p className="font-display text-lg text-ink">Import this library file?</p>
            <p className="mt-2 text-ink/60">
              This will add {pendingImport.poems.length} poem{pendingImport.poems.length === 1 ? '' : 's'},{' '}
              {(pendingImport.stories ?? []).length} stor
              {(pendingImport.stories ?? []).length === 1 ? 'y' : 'ies'},{' '}
              {pendingImport.collections.length} collection{pendingImport.collections.length === 1 ? '' : 's'}, and{' '}
              {pendingImport.snapshots.length} snapshot{pendingImport.snapshots.length === 1 ? '' : 's'} alongside
              what you already have. Nothing existing will be overwritten — anything with a clashing id is
              added as a copy instead.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingImport(null)} className="text-ink/50 hover:underline">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="rounded-full bg-indigo px-4 py-1.5 font-medium text-paper hover:bg-indigo-soft"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {lastResult && (
        <span className="text-verdigris">
          Imported {lastResult.poemsAdded} poem{lastResult.poemsAdded === 1 ? '' : 's'} and{' '}
          {lastResult.storiesAdded} stor{lastResult.storiesAdded === 1 ? 'y' : 'ies'}.
        </span>
      )}
    </div>
  )
}
