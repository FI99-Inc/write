import { useRef, useState } from 'react'
import { useModalFocus } from '@/engines/useModalFocus'

export function CheckpointButton({ save }: { save: (label?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  useModalFocus(dialog, open, () => {
    if (!busy) setOpen(false)
  })
  return (
    <>
      <button
        className="shrink-0 whitespace-nowrap py-1.5 text-ink/60 hover:text-indigo"
        onClick={() => {
          setError('')
          setOpen(true)
        }}
      >
        Checkpoint
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 px-4">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkpoint-title"
            tabIndex={-1}
            className="w-full max-w-sm rounded-lg border border-canvas-line bg-paper p-6 text-left text-sm shadow-lg"
          >
            <h2 id="checkpoint-title" className="font-display text-xl text-ink">
              Save a checkpoint
            </h2>
            <p className="mt-2 mb-4 leading-relaxed text-ink/60">
              Keep this version so you can compare or restore it later.
            </p>
            <form
              onSubmit={async (event) => {
                event.preventDefault()
                if (busy) return
                setBusy(true)
                try {
                  await save(label.trim() || undefined)
                  setOpen(false)
                  setLabel('')
                } catch {
                  setError('Could not save this checkpoint. Try again; your writing is still here.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <label className="field-label">
                Name (optional)
                <input
                  className="field-input mt-1"
                  maxLength={200}
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Before revising the ending"
                />
              </label>
              {error && (
                <p className="mt-3 text-berry" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <button className="action-primary" disabled={busy}>
                  Save checkpoint
                </button>
                <button
                  className="action-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
