import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getPoem } from '@/db/poems'
import { listSnapshots, restoreSnapshot } from '@/db/snapshots'
import { DiffView } from '@/features/editor/DiffView'

const CURRENT = 'current'

export function HistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const poem = useLiveQuery(() => (id ? getPoem(id) : null), [id])
  const snapshots = useLiveQuery(() => (id ? listSnapshots(id) : []), [id])

  const [compareA, setCompareA] = useState<string>(CURRENT)
  const [compareB, setCompareB] = useState<string>(CURRENT)
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)

  const versions = useMemo(() => {
    const list: { id: string; label: string; body: string }[] = []
    if (poem) list.push({ id: CURRENT, label: 'Current', body: poem.body })
    for (const snapshot of snapshots ?? []) {
      list.push({
        id: snapshot.id,
        label: `${new Date(snapshot.createdAt).toLocaleString()}${snapshot.label ? ` — ${snapshot.label}` : ''}`,
        body: snapshot.body,
      })
    }
    return list
  }, [poem, snapshots])

  const bodyById = useMemo(() => new Map(versions.map((v) => [v.id, v.body])), [versions])

  async function handleRestore(snapshotId: string) {
    await restoreSnapshot(snapshotId)
    setPendingRestoreId(null)
  }

  if (poem === undefined || snapshots === undefined) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas">
        <p className="text-sm text-ink/50">Loading…</p>
      </div>
    )
  }

  if (poem === null) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-canvas">
        <p className="font-display text-lg text-ink">This poem doesn&rsquo;t exist (anymore).</p>
        <button type="button" onClick={() => navigate('/')} className="text-indigo hover:underline">
          Back to library
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-canvas">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-line px-4 py-3 sm:px-8 sm:py-4">
        <Link to={`/poem/${id}`} className="text-sm text-ink/50 transition-colors hover:text-indigo">
          ← Back to poem
        </Link>
        <h1 className="min-w-0 truncate font-display text-base text-ink sm:text-lg">{poem.title || 'Untitled'} — History</h1>
        <span className="hidden sm:block sm:w-24" />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        {snapshots.length === 0 ? (
          <p className="text-sm text-ink/50">
            No snapshots yet. Use the &ldquo;Snapshot&rdquo; button in the editor to save a checkpoint you can
            come back to.
          </p>
        ) : (
          <ul className="mb-10 divide-y divide-canvas-line rounded-lg border border-canvas-line bg-paper">
            {versions
              .filter((v) => v.id !== CURRENT)
              .map((version) => (
                <li key={version.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
                  <span className="text-sm text-ink/70">{version.label}</span>
                  {pendingRestoreId === version.id ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
                      <span className="text-ink/50">Restore this version?</span>
                      <button
                        type="button"
                        onClick={() => handleRestore(version.id)}
                        className="font-medium text-indigo hover:underline"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRestoreId(null)}
                        className="text-ink/50 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingRestoreId(version.id)}
                      className="shrink-0 text-xs text-ink/40 hover:text-indigo"
                    >
                      Restore
                    </button>
                  )}
                </li>
              ))}
          </ul>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ink/70">
          <span>Compare</span>
          <select
            value={compareA}
            onChange={(event) => setCompareA(event.target.value)}
            className="rounded border border-canvas-line bg-paper px-2 py-1"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <span>with</span>
          <select
            value={compareB}
            onChange={(event) => setCompareB(event.target.value)}
            className="rounded border border-canvas-line bg-paper px-2 py-1"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <DiffView oldText={bodyById.get(compareA) ?? ''} newText={bodyById.get(compareB) ?? ''} />
      </main>
    </div>
  )
}
