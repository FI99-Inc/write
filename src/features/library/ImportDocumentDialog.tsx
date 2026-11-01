import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModalFocus } from '@/engines/useModalFocus'
import { readImportFile, type ImportedDocument } from '@/engines/interchange/importDocument'
import { saveImportedDocument } from '@/db/importDocument'
import { documentPath, type DocKind } from '@/types/libraryDoc'
import { SafeRichPreview } from '@/features/editor/story/SafeRichPreview'

export function ImportDocumentDialog({ onClose }: { onClose: () => void }) {
  const [preview, setPreview] = useState<ImportedDocument | null>(null)
  const [kind, setKind] = useState<DocKind>('story')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const locked = useRef(false)
  const dialog = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  function close() {
    if (locked.current) return
    controller.current?.abort()
    onClose()
  }
  useModalFocus(dialog, true, close)
  useEffect(() => () => controller.current?.abort(), [])
  async function read(file: File) {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setPreview(null)
    setError('')
    setBusy(true)
    try {
      const imported = await readImportFile(file, current.signal)
      if (!current.signal.aborted) setPreview(imported)
    } catch (reason) {
      if (!current.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'Could not read this document.')
    } finally {
      if (controller.current === current) setBusy(false)
    }
  }
  async function confirm() {
    if (!preview || locked.current) return
    locked.current = true
    setSaving(true)
    setError('')
    try {
      const doc = await saveImportedDocument(preview, kind)
      onClose()
      navigate(documentPath(doc))
    } catch {
      setError('Could not save this imported document. Your existing writing has been kept.')
    } finally {
      locked.current = false
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 px-4">
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-document-title"
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-lg border border-canvas-line bg-paper p-5 text-ink shadow-lg sm:p-7"
      >
        <h2 id="import-document-title" className="font-display text-2xl">
          Import writing
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Open text, Markdown, or Word (.docx). Preview the writing before adding it to your
          library.
        </p>
        <label className="field-label mt-4">
          Document file
          <input
            type="file"
            className="field-input mt-1"
            accept=".txt,.md,.markdown,.docx"
            disabled={saving}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void read(file)
            }}
          />
        </label>
        {busy && (
          <p role="status" className="mt-4 text-sm">
            Reading document… You can cancel while it is being converted.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-berry">
            {error}
          </p>
        )}
        {preview && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="field-label">
                Title
                <input
                  className="field-input mt-1"
                  value={preview.title}
                  onChange={(event) => setPreview({ ...preview, title: event.target.value })}
                />
              </label>
              <label className="field-label">
                Add as
                <select
                  className="field-input mt-1"
                  value={kind}
                  onChange={(event) => setKind(event.target.value as DocKind)}
                >
                  <option value="story">Story</option>
                  <option value="poem">Poem</option>
                  <option value="idea">Idea</option>
                </select>
              </label>
            </div>
            <p className="text-xs leading-relaxed text-ink/60">
              {kind === 'poem'
                ? 'Poems use plain text and preserve line breaks. Choose Story or Idea to keep rich formatting.'
                : 'Keeps headings, basic text formatting, links, lists, and line breaks. Word page layout, images, and anchored comments are not imported; use library JSON for a complete WR!TE backup.'}
            </p>
            {preview.warnings.length > 0 && (
              <details className="text-xs text-ink/70">
                <summary>Conversion notes ({preview.warnings.length})</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preview.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </details>
            )}
            <h3 className="font-display text-lg">Preview</h3>
            {kind === 'poem' ? (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded border border-canvas-line p-4 font-display text-sm">
                {preview.body.slice(0, 50000)}
              </pre>
            ) : (
              <SafeRichPreview
                content={preview.content}
                className="max-h-80 overflow-auto rounded border border-canvas-line p-4 text-sm"
              />
            )}
            <p className="text-xs text-ink/50">
              Preview shows up to 50 blocks. The complete document will be imported as new writing.
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="action-primary"
            disabled={!preview || busy || saving}
            onClick={() => void confirm()}
          >
            {saving ? 'Importing…' : 'Import document'}
          </button>
          <button className="action-secondary" disabled={saving} onClick={close}>
            {busy ? 'Cancel import' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
