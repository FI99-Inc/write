import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { PoemStatus } from '@/types/poem'
import { POEM_STATUSES } from '@/types/poem'
import type { LibraryDoc } from '@/types/libraryDoc'
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
  viewMode: 'list' | 'grid'
}

/** Renders a poem or a story in the unified library list — the same card
 * either way, routing to /poem/:id or /story/:id and writing through
 * updatePoem/deletePoem or updateStory/deleteStory depending on `doc.kind`. */
export function LibraryListItem({ doc, formName, viewMode }: LibraryListItemProps) {
  const navigate = useNavigate()
  const [pendingDelete, setPendingDelete] = useState(false)
  const [editingTags, setEditingTags] = useState(false)
  const [tagsDraft, setTagsDraft] = useState((doc.tags ?? []).join(', '))

  const update = doc.kind === 'poem' ? updatePoem : updateStory
  const remove = doc.kind === 'poem' ? deletePoem : deleteStory
  const path = doc.kind === 'poem' ? `/poem/${doc.id}` : `/story/${doc.id}`

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
          <span className="block truncate font-display text-lg text-ink">{doc.title || 'Untitled'}</span>
          <span className="block truncate text-sm italic text-ink/50">{firstLine ?? 'Nothing written yet'}</span>
        </button>
      </div>

      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-xs ${viewMode === 'grid' ? '' : 'sm:shrink-0'}`}>
        <span className="rounded-full border border-canvas-line px-2 py-0.5 capitalize text-ink/50">
          {doc.kind}
        </span>

        {formName && (
          <span className="rounded-full border border-canvas-line px-2 py-0.5 text-ink/50">{formName}</span>
        )}

        <select
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

        <span className="text-ink/30">{new Date(doc.modifiedAt).toLocaleDateString()}</span>

        <Link to={`${path}/history`} className="text-ink/40 hover:text-indigo">
          History
        </Link>

        {pendingDelete ? (
          <span className="flex items-center gap-2">
            <button type="button" onClick={handleDelete} className="font-medium text-berry hover:underline">
              Delete
            </button>
            <button type="button" onClick={() => setPendingDelete(false)} className="text-ink/50 hover:underline">
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setPendingDelete(true)}
            aria-label={`Delete "${doc.title || 'Untitled'}"`}
            className="text-ink/40 hover:text-berry"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
