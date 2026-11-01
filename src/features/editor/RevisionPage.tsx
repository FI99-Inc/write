import { AppHeader } from '@/features/workspace/AppHeader'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { JSONContent } from '@tiptap/core'
import { getPoem } from '@/db/poems'
import { getStory, restoreStorySnapshot } from '@/db/stories'
import { listSnapshots, restoreSnapshot } from '@/db/snapshots'
import { nameSnapshot, restorePassage } from '@/db/revisions'
import { SafeRichPreview } from '@/features/editor/story/SafeRichPreview'
import { plainTextToDoc } from '@/engines/richText/projection'
import { DiffView } from '@/features/editor/DiffView'
import type { DocKind } from '@/types/libraryDoc'
const CURRENT = 'current'
function contentOf(document: { body: string; content?: JSONContent }) {
  return document.content
}

export function RevisionPage({ poem = false }: { poem?: boolean }) {
  const { id } = useParams()
  const document = useLiveQuery(
    () => (id ? (poem ? getPoem(id) : getStory(id)) : null),
    [id, poem],
  )
  const snapshots = useLiveQuery(() => (id ? listSnapshots(id) : []), [id])
  const [compareA, setA] = useState('latest')
  const [compareB, setB] = useState(CURRENT)
  const [formatting, setFormatting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sourceFrom, setSourceFrom] = useState('1'),
    [sourceTo, setSourceTo] = useState('1')
  const [targetFrom, setTargetFrom] = useState('1'),
    [targetTo, setTargetTo] = useState('1')
  const [insert, setInsert] = useState(false)
  const versions = useMemo(() => {
    if (!document) return []
    return [
      {
        id: CURRENT,
        label: 'Current writing',
        body: document.body,
        content: contentOf(document),
      },
      ...(snapshots ?? []).map((snapshot) => ({
        ...snapshot,
        label: `${snapshot.label || 'Unnamed version'} — ${new Date(snapshot.createdAt).toLocaleString()}`,
      })),
    ]
  }, [document, snapshots])
  const sourceId =
    compareA === 'latest' ? (snapshots?.[0]?.id ?? CURRENT) : compareA
  const source = versions.find((version) => version.id === sourceId)
  const target = versions.find((version) => version.id === compareB)
  const kind: DocKind = poem
    ? 'poem'
    : document && 'kind' in document && document.kind === 'idea'
      ? 'idea'
      : 'story'
  const rich = document && 'format' in document && document.format === 'rich'
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not update this revision.',
      )
    } finally {
      setBusy(false)
    }
  }
  const unitCount = (body: string, content?: JSONContent) =>
    rich
      ? ((content ?? plainTextToDoc(body)).content?.length ?? 1)
      : body.split('\n').length
  async function restoreSelected() {
    if (!id || !source || sourceId === CURRENT || !document) return
    await restorePassage({
      id,
      kind,
      snapshotId: sourceId,
      source: { from: Number(sourceFrom), to: Number(sourceTo) },
      target: {
        from: Number(targetFrom),
        to: insert ? Number(targetFrom) - 1 : Number(targetTo),
      },
      expectedSavedAt: document.draftSavedAt ?? document.modifiedAt,
      expectedBody: document.body,
    })
    setMessage(
      'Passage restored. A safety version keeps your previous writing.',
    )
    setB(CURRENT)
  }
  if (document === undefined || snapshots === undefined)
    return (
      <p role="status" className="p-8">
        Loading history…
      </p>
    )
  if (!document)
    return (
      <main className="p-8">
        <p>This writing is unavailable. Check Trash or open your library.</p>
        <Link to="/" className="header-action">
          Library
        </Link>
      </main>
    )
  return (
    <div className="min-h-full bg-canvas">
      <AppHeader />
      <header className="workspace-header">
        <Link to={`/${kind}/${id}`} className="header-action">
          Back to writing
        </Link>
        <h1 className="min-w-0 truncate font-display text-xl">
          {document.title || 'Untitled'} — History
        </h1>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        {error && (
          <p role="alert" className="text-sm text-berry">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-verdigris">
            {message}
          </p>
        )}
        <section>
          <h2 className="font-display text-xl">Saved versions</h2>
          <p className="mt-2 mb-4 text-sm text-ink/60">
            Name checkpoints in the editor. Restoring writing also saves a
            safety version.
          </p>
          {!snapshots.length ? (
            <p className="text-sm text-ink/60">
              No saved versions yet. Save a checkpoint in the editor.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-canvas-line overflow-y-auto border-y border-canvas-line">
              {snapshots.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <form
                    className="flex min-w-0 flex-1 gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const data = new FormData(event.currentTarget)
                      void run(() =>
                        nameSnapshot(
                          snapshot.id,
                          String(data.get('name') ?? ''),
                        ),
                      )
                    }}
                  >
                    <label className="field-label min-w-0 flex-1">
                      <span className="sr-only">
                        Name version from{' '}
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </span>
                      <input
                        key={snapshot.label}
                        className="field-input"
                        name="name"
                        defaultValue={snapshot.label ?? ''}
                        maxLength={200}
                        placeholder="Unnamed version"
                      />
                    </label>
                    <button className="quiet-button text-xs" disabled={busy}>
                      Rename
                    </button>
                  </form>
                  <span className="text-xs text-ink/50">
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </span>
                  <button
                    className="quiet-button text-xs"
                    disabled={busy}
                    onClick={() => {
                      setA(snapshot.id)
                      setB(CURRENT)
                    }}
                  >
                    Compare
                  </button>
                  <button
                    className="quiet-button text-xs"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Restore this complete version? Your current writing will be saved as a safety version.',
                        )
                      )
                        void run(async () => {
                          await (poem ? restoreSnapshot : restoreStorySnapshot)(
                            snapshot.id,
                          )
                          setMessage(
                            'Version restored. Your previous writing is kept in history.',
                          )
                        })
                    }}
                  >
                    Restore version
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-4 font-display text-xl">Compare versions</h2>
          <div className="mb-4 flex flex-wrap gap-4">
            <label className="field-label min-w-0 flex-1">
              Earlier / source
              <select
                aria-label="Source version"
                className="field-input mt-1"
                value={sourceId}
                onChange={(event) => setA(event.target.value)}
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label min-w-0 flex-1">
              Later / comparison
              <select
                aria-label="Comparison version"
                className="field-input mt-1"
                value={compareB}
                onChange={(event) => setB(event.target.value)}
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DiffView oldText={source?.body ?? ''} newText={target?.body ?? ''} />
          {rich && (
            <>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formatting}
                  onChange={(event) => setFormatting(event.target.checked)}
                />
                Show formatting previews
              </label>
              {formatting && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <VersionPreview
                    label="Source formatting"
                    body={source?.body ?? ''}
                    content={source?.content}
                  />
                  <VersionPreview
                    label="Comparison formatting"
                    body={target?.body ?? ''}
                    content={target?.content}
                  />
                </div>
              )}
            </>
          )}
        </section>
        {source && sourceId !== CURRENT && (
          <section className="border-t border-canvas-line pt-6">
            <h2 className="font-display text-xl">Restore a passage</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Choose{' '}
              {rich
                ? 'top-level blocks (a paragraph, heading, list, or quotation)'
                : 'lines'}{' '}
              from the source version and where they belong in your current
              writing. Source: {unitCount(source.body, source.content)}{' '}
              {rich ? 'blocks' : 'lines'}. Current:{' '}
              {unitCount(document.body, contentOf(document))}. The rest of your
              writing stays intact.
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void run(restoreSelected)
              }}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="field-label">
                  Source start
                  <input
                    className="field-input mt-1"
                    type="number"
                    min="1"
                    required
                    value={sourceFrom}
                    onChange={(event) => setSourceFrom(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Source end
                  <input
                    className="field-input mt-1"
                    type="number"
                    min="1"
                    required
                    value={sourceTo}
                    onChange={(event) => setSourceTo(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Current start
                  <input
                    className="field-input mt-1"
                    type="number"
                    min="1"
                    required
                    value={targetFrom}
                    onChange={(event) => setTargetFrom(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Current end
                  <input
                    className="field-input mt-1"
                    type="number"
                    min="1"
                    required
                    disabled={insert}
                    value={targetTo}
                    onChange={(event) => setTargetTo(event.target.value)}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={insert}
                  onChange={(event) => setInsert(event.target.checked)}
                />
                Insert before Current start instead of replacing
              </label>
              <p className="text-sm text-ink/60">
                {insert ? 'Insert' : 'Restore'} source {sourceFrom}–{sourceTo}{' '}
                {insert
                  ? `before current ${targetFrom}`
                  : `over current ${targetFrom}–${targetTo}`}
                . A safety version will be saved.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <PassagePreview
                  label="Source passage"
                  body={source.body}
                  content={source.content}
                  rich={Boolean(rich)}
                  from={Number(sourceFrom)}
                  to={Number(sourceTo)}
                />
                {!insert && (
                  <PassagePreview
                    label="Current passage to replace"
                    body={document.body}
                    content={contentOf(document)}
                    rich={Boolean(rich)}
                    from={Number(targetFrom)}
                    to={Number(targetTo)}
                  />
                )}
              </div>
              <button className="action-primary" disabled={busy}>
                Restore selected passage
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}

function VersionPreview({
  label,
  body,
  content,
}: {
  label: string
  body: string
  content?: JSONContent
}) {
  return (
    <section className="min-w-0 rounded border border-canvas-line bg-paper p-4">
      <h3 className="mb-3 text-sm text-ink/60">{label} (first 50 blocks)</h3>
      <SafeRichPreview
        body={body}
        content={content}
        className="max-h-80 overflow-auto"
      />
    </section>
  )
}
function PassagePreview({
  label,
  body,
  content,
  rich,
  from,
  to,
}: {
  label: string
  body: string
  content?: JSONContent
  rich: boolean
  from: number
  to: number
}) {
  const units = rich
    ? ((content ?? plainTextToDoc(body)).content ?? [])
    : body.split('\n')
  const valid =
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 1 &&
    to >= from &&
    to <= units.length
  const selected = valid ? units.slice(from - 1, Math.min(to, from + 49)) : []
  return (
    <section className="min-w-0 rounded border border-canvas-line bg-paper p-3">
      <h3 className="mb-2 text-xs text-ink/60">
        {label} {from}–{to}
      </h3>
      {!valid ? (
        <p className="text-xs text-berry">Choose a valid range.</p>
      ) : rich ? (
        <SafeRichPreview
          content={{ type: 'doc', content: selected as JSONContent[] }}
          className="max-h-48 overflow-auto text-sm"
        />
      ) : (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-display text-sm">
          {(selected as string[]).join('\n')}
        </pre>
      )}
      {valid && to - from >= 50 && (
        <p className="mt-2 text-xs text-ink/50">First 50 units shown.</p>
      )}
    </section>
  )
}
