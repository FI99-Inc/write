import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { developIdea } from '@/db/developIdea'
import { documentPath, type LibraryDoc } from '@/types/libraryDoc'

export function WorkspaceContext({ id, sourceIdeaId }: { id: string; sourceIdeaId?: string }) {
  const projects =
    useLiveQuery(
      () =>
        db.projects
          .filter((project) => project.items.some((item) => item.documentId === id))
          .toArray(),
      [id],
    ) ?? []
  if (!sourceIdeaId && !projects.length) return null
  return (
    <nav
      aria-label="Writing context"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-canvas-line bg-paper/50 px-4 py-2 text-xs text-ink/60 sm:px-8"
    >
      {sourceIdeaId && (
        <Link
          className="hover:text-indigo underline underline-offset-2"
          to={`/idea/${sourceIdeaId}`}
        >
          Source Idea and notes
        </Link>
      )}
      {projects.map((project) => {
        const index = project.items.findIndex((item) => item.documentId === id)
        const before = project.items[index - 1]
        const after = project.items[index + 1]
        return (
          <span key={project.id} className="flex flex-wrap items-center gap-3">
            <Link className="font-medium hover:text-indigo" to={`/projects/${project.id}`}>
              {project.name}
            </Link>
            {before && (
              <Link
                to={documentPath({ id: before.documentId, kind: before.kind } as LibraryDoc)}
                className="hover:text-indigo"
                aria-label={`Previous writing in ${project.name}`}
              >
                Previous
              </Link>
            )}
            {after && (
              <Link
                to={documentPath({ id: after.documentId, kind: after.kind } as LibraryDoc)}
                className="hover:text-indigo"
                aria-label={`Next writing in ${project.name}`}
              >
                Next
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export function DevelopIdeaButton({ id, prepare }: { id: string; prepare: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function develop(kind: 'poem' | 'story') {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await prepare()
      const doc = await developIdea(id, kind)
      navigate(documentPath(doc))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not develop this Idea.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="relative">
      <button className="header-action" aria-expanded={open} onClick={() => setOpen(!open)}>
        Develop Idea
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-canvas-line bg-paper p-4 text-sm shadow-lg">
          <p className="mb-3 leading-relaxed text-ink/70">
            Create linked writing. Your original Idea, comments, and versions stay available.
          </p>
          <div className="flex gap-2">
            <button
              className="action-secondary"
              disabled={busy}
              onClick={() => void develop('poem')}
            >
              As poem
            </button>
            <button
              className="action-primary"
              disabled={busy}
              onClick={() => void develop('story')}
            >
              As story
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-berry">
              {error}
            </p>
          )}
          <button className="quiet-button mt-3" disabled={busy} onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  )
}
