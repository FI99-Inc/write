import { startTransition, useOptimistic, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { PoemStatus } from '@/types/poem'
import { POEM_STATUSES } from '@/types/poem'
import { setDocumentCollection } from '@/db/documents'
import type { Collection } from '@/types/collection'
import { documentPath, type LibraryDoc } from '@/types/libraryDoc'
import { updatePoem, deletePoem } from '@/db/poems'
import { updateStory, deleteStory } from '@/db/stories'

function firstLineOf(body: string): string | null {
  return body.split('\n').find((line) => line.trim().length > 0) ?? null
}

const STATUS_COLOR: Record<PoemStatus, string> = {
  idea: 'text-ink/40',
  draft: 'text-indigo',
  revising: 'text-berry',
  done: 'text-verdigris',
}

interface LibraryListItemProps {
  doc: LibraryDoc
  formName: string | null
  collections: Collection[]
  viewMode: 'list' | 'grid'
}

/** Renders a poem or a story in the unified library list — the same card
 * either way, routing to /poem/:id or /story/:id and writing through
 * updatePoem/deletePoem or updateStory/deleteStory depending on `doc.kind`. */
export function LibraryListItem({ doc, formName, viewMode, collections }: LibraryListItemProps) {
  const navigate = useNavigate()
  const [memberships, setMembership] = useOptimistic(
    doc.collectionIds ?? [],
    (current: string[], change: { id: string; selected: boolean }) => {
      const next = new Set(current)
      if (change.selected) next.add(change.id)
      else next.delete(change.id)
      return [...next]
    },
  )
  function changeMembership(id: string, selected: boolean) {
    setError('')
    startTransition(async () => {
      setMembership({ id, selected })
      try {
        await setDocumentCollection(doc, id, selected)
      } catch {
        setError('Could not update collection membership.')
      }
    })
  }
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(false)
  const [editingTags, setEditingTags] = useState(false)
  const [tagsDraft, setTagsDraft] = useState((doc.tags ?? []).join(', '))

  const update = doc.kind === 'poem' ? updatePoem : updateStory
  const remove = doc.kind === 'poem' ? deletePoem : deleteStory
  const path = documentPath(doc)

  function toggleFavorite() {
    void update(doc.id, { favorite: !doc.favorite })
  }

  function handleStatusChange(status: PoemStatus) {
    void update(doc.id, { status })
  }

  function commitTags() {
    const tags = tagsDraft
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    void update(doc.id, { tags })
    setEditingTags(false)
  }

  async function handleDelete() {
    await remove(doc.id)
    setPendingDelete(false)
  }

  const firstLine = firstLineOf(doc.body)

  return (
    <div
      className={`flex gap-3 px-4 py-4 sm:px-5 ${
        viewMode === 'grid'
          ? 'flex-col rounded-lg border border-canvas-line bg-paper'
          : // Below sm the title and the metadata row stack; side by side
            // they'd leave the title a dozen characters wide.
            'flex-col sm:flex-row sm:items-center'
      }`}
    >
      <div className={`flex items-center gap-3 ${viewMode === 'grid' ? '' : 'min-w-0 sm:flex-1'}`}>
        <button
          type="button"
          onClick={toggleFavorite}
          aria-label={doc.favorite ? 'Unfavorite' : 'Favorite'}
          aria-pressed={doc.favorite}
          className={`shrink-0 text-lg ${doc.favorite ? 'text-berry' : 'text-ink/20 hover:text-ink/40'}`}
        >
          {doc.favorite ? '★' : '☆'}
        </button>

        <button
          type="button"
          onClick={() => navigate(path)}
          className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo"
        >
          <span className="block truncate font-display text-lg text-ink">
            {doc.title || 'Untitled'}
          </span>
          <span className="block truncate text-sm italic text-ink/50">
            {firstLine ?? 'Nothing written yet'}
          </span>
        </button>
      </div>

      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-xs ${viewMode === 'grid' ? '' : 'sm:shrink-0'}`}
      >
        <span className="rounded-full border border-canvas-line px-2 py-0.5 capitalize text-ink/50">
          {doc.kind}
        </span>

        {formName && (
          <span className="rounded-full border border-canvas-line px-2 py-0.5 text-ink/50">
            {formName}
          </span>
        )}

        <select
          aria-label={`Status for ${doc.title || 'Untitled'}`}
          value={doc.status ?? 'draft'}
          onChange={(e) => handleStatusChange(e.target.value as PoemStatus)}
          className={`rounded border-none bg-transparent py-0.5 font-medium ${STATUS_COLOR[doc.status ?? 'draft']}`}
        >
          {POEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {editingTags ? (
          <input
            autoFocus
            aria-label="Document tags"
            value={tagsDraft}
            onChange={(e) => setTagsDraft(e.target.value)}
            onBlur={commitTags}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTags()
              if (e.key === 'Escape') setEditingTags(false)
            }}
            placeholder="tag1, tag2"
            className="w-32 rounded border border-canvas-line bg-canvas px-1.5 py-0.5 text-ink outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTagsDraft((doc.tags ?? []).join(', '))
              setEditingTags(true)
            }}
            className="flex flex-wrap gap-1 text-ink/40 hover:text-indigo"
          >
            {(doc.tags ?? []).length > 0 ? (
              (doc.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-full bg-canvas px-2 py-0.5">
                  {tag}
                </span>
              ))
            ) : (
              <span>+ tags</span>
            )}
          </button>
        )}

        {collections.length > 0 && (
          <details
            className="relative"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.currentTarget.open = false
                event.currentTarget.querySelector('summary')?.focus()
              }
            }}
          >
            <summary className="cursor-pointer list-none text-ink/60">
              Collections ({memberships.length})
            </summary>
            <div className="absolute right-0 z-10 mt-2 min-w-48 space-y-2 rounded border border-canvas-line bg-paper p-3 shadow-lg">
              {collections.map((collection) => (
                <label key={collection.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memberships.includes(collection.id)}
                    onChange={(event) => changeMembership(collection.id, event.target.checked)}
                  />
                  {collection.name}
                </label>
              ))}
            </div>
          </details>
        )}
        {error && (
          <span role="alert" className="text-berry">
            {error}
          </span>
        )}
        <span className="text-ink/30">{new Date(doc.modifiedAt).toLocaleDateString()}</span>

        <Link to={`${path}/history`} className="text-ink/40 hover:text-indigo">
          History
        </Link>

        {pendingDelete ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="font-medium text-berry hover:underline"
            >
              Move to Trash
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(false)}
              className="text-ink/50 hover:underline"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setPendingDelete(true)}
            aria-label={`Move to Trash: "${doc.title || 'Untitled'}"`}
            className="text-ink/40 hover:text-berry"
          >
            Trash
          </button>
        )}
      </div>
    </div>
  )
}
