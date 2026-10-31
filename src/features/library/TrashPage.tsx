import { AppHeader } from '@/features/workspace/AppHeader'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  listDocuments,
  listOrphanedHistory,
  restoreDocument,
  purgeDocument,
  recoverHistory,
} from '@/db/documents'

export function TrashPage() {
  const documents = useLiveQuery(() => listDocuments(true), [])
  const orphans = useLiveQuery(() => listOrphanedHistory(), [])
  const [confirm, setConfirm] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
      setConfirm(null)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not complete this action.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="min-h-full bg-canvas">
      <AppHeader />
      <header className="flex items-center gap-5 border-b border-canvas-line px-4 py-4 sm:px-8 sm:py-6">
        <h1 className="font-display text-2xl">Trash</h1>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-8">
        <p className="text-sm text-ink/70">
          Deleted writing and its history stay here until you restore them or
          delete them permanently. Library backups include Trash.
        </p>
        {error && (
          <p role="alert" className="text-berry">
            {error}
          </p>
        )}
        {!documents ? (
          <p>Loading Trash…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-ink/60">Trash is empty.</p>
        ) : (
          <ul className="divide-y divide-canvas-line rounded-lg border border-canvas-line bg-paper">
            {documents.map((doc) => (
              <li key={doc.id} className="space-y-3 p-4">
                <div>
                  <h2 className="font-display text-lg">
                    {doc.title || 'Untitled'}
                  </h2>
                  <p className="text-xs capitalize text-ink/60">
                    {doc.kind} · {new Date(doc.deletedAt!).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => restoreDocument(doc))}
                    className="text-indigo"
                  >
                    Restore
                  </button>
                  {confirm === doc.id ? (
                    <>
                      <span className="text-berry">
                        Delete this writing and every saved version permanently?
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => purgeDocument(doc))}
                        className="font-medium text-berry"
                      >
                        Confirm permanent deletion
                      </button>
                      <button type="button" onClick={() => setConfirm(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirm(doc.id)}
                      className="text-ink/60 hover:text-berry"
                    >
                      Delete permanently
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {orphans && orphans.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl">
              History from earlier deletions
            </h2>
            <p className="text-sm text-ink/60">
              These versions were left by earlier app versions. Recover the
              writing to access all of its history.
            </p>
            <ul className="space-y-3">
              {orphans.map((snapshot) => (
                <li
                  key={snapshot.poemId}
                  className="space-y-2 rounded border border-canvas-line bg-paper p-4"
                >
                  <h3>{snapshot.title || 'Untitled'}</h3>
                  <p className="truncate text-sm text-ink/60">
                    {snapshot.body.slice(0, 160)}
                  </p>
                  <div className="flex gap-4 text-sm text-indigo">
                    {!snapshot.content && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(() => recoverHistory(snapshot, 'poem'))
                        }
                      >
                        Recover as poem
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(() => recoverHistory(snapshot, 'story'))
                      }
                    >
                      Recover as story
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
