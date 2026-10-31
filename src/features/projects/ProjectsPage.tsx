import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listDocuments } from '@/db/documents'
import {
  createProject,
  createProjectWriting,
  listProjects,
  renameProject,
  addProjectItem,
  removeProjectItem,
  moveProjectItem,
  setProjectRole,
  deleteProject,
} from '@/db/projects'
import { documentPath, type DocKind } from '@/types/libraryDoc'
import type { Project, ProjectRole } from '@/types/project'
import { AppHeader } from '@/features/workspace/AppHeader'
import { useSettings } from '@/engines/useSettings'

export function ProjectsPage() {
  const { id } = useParams()
  const projects = useLiveQuery(listProjects, [])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const project = projects?.find((entry) => entry.id === id)
  async function create(event: React.FormEvent) {
    event.preventDefault()
    try {
      const result = await createProject(name)
      setName('')
      navigate(`/projects/${result.id}`)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not create this project.',
      )
    }
  }
  return (
    <div className="min-h-full bg-canvas">
      <AppHeader />
      <header className="workspace-header">
        <h1 className="font-display text-2xl">Projects</h1>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <form onSubmit={create} className="space-y-3">
            <label className="field-label">
              New project
              <input
                className="field-input mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Project name"
                required
                maxLength={200}
              />
            </label>
            <button className="action-primary" type="submit">
              Create project
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm text-berry">
              {error}
            </p>
          )}
          <nav aria-label="Projects" className="mt-6 space-y-1">
            {projects?.map((entry) => (
              <Link
                key={entry.id}
                to={`/projects/${entry.id}`}
                aria-current={entry.id === id ? 'page' : undefined}
                className={`block rounded px-3 py-2 text-sm ${entry.id === id ? 'bg-paper text-indigo' : 'text-ink/70 hover:bg-paper'}`}
              >
                {entry.name}
                <span className="ml-2 text-xs text-ink/50">
                  {entry.items.length}
                </span>
              </Link>
            ))}
          </nav>
        </aside>
        {projects === undefined ? (
          <p role="status">Loading projects…</p>
        ) : project ? (
          <ProjectDetail key={project.id} project={project} />
        ) : (
          <section className="py-12">
            <h2 className="font-display text-3xl">
              Give your writing a shape.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/60">
              Gather chapters and scenes in reading order, with Ideas nearby for
              research and planning. Your writing stays in the library, too.
            </p>
            {id && (
              <p className="mt-4 text-sm text-berry">
                This project is no longer available.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function ProjectDetail({ project }: { project: Project }) {
  const { settings } = useSettings()
  const docs = useLiveQuery(() => listDocuments(), []) ?? []
  const byId = new Map(docs.map((doc) => [doc.id, doc]))
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [documentId, setDocumentId] = useState('')
  const [role, setRole] = useState<ProjectRole>('chapter')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function run(task: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await task()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not update this project.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function create(kind: DocKind, role: ProjectRole) {
    const doc = await createProjectWriting(
      project.id,
      kind,
      role,
      settings.storyEditorMode,
    )
    navigate(documentPath(doc))
  }

  const available = docs.filter(
    (doc) => !project.items.some((item) => item.documentId === doc.id),
  )
  function move(index: number, delta: number) {
    const before =
      delta < 0
        ? project.items[index - 1]?.documentId
        : (project.items[index + 2]?.documentId ?? null)
    return run(() =>
      moveProjectItem(
        project.id,
        project.items[index].documentId,
        before ?? null,
      ),
    )
  }
  return (
    <section className="min-w-0 space-y-6">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void run(() => renameProject(project.id, name, description))
        }}
      >
        <label className="field-label">
          Project name
          <input
            className="field-input mt-1 font-display text-2xl"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label className="field-label">
          Outline and notes
          <textarea
            className="field-input mt-1 min-h-24"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What holds this work together?"
          />
        </label>
        <button className="action-secondary" disabled={busy}>
          Save project details
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-berry">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className="action-primary"
          disabled={busy}
          onClick={() => void run(() => create('story', 'chapter'))}
        >
          New chapter
        </button>
        <button
          className="action-secondary"
          disabled={busy}
          onClick={() => void run(() => create('story', 'scene'))}
        >
          New scene
        </button>
        <button
          className="action-secondary"
          disabled={busy}
          onClick={() => void run(() => create('idea', 'reference'))}
        >
          New research Idea
        </button>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const doc = byId.get(documentId)
          if (doc)
            void run(async () => {
              await addProjectItem(project.id, {
                documentId,
                kind: doc.kind,
                role,
              })
              // A writer may already have chosen the next entry while this write was pending.
              setDocumentId((current) =>
                current === documentId ? '' : current,
              )
            })
        }}
      >
        <label className="field-label min-w-40 flex-1">
          Existing writing
          <select
            className="field-input mt-1"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            required
          >
            <option value="">Choose writing</option>
            {available.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title || 'Untitled'} ({doc.kind})
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Use as
          <select
            className="field-input mt-1"
            value={role}
            onChange={(event) => setRole(event.target.value as ProjectRole)}
          >
            <option value="chapter">Chapter</option>
            <option value="scene">Scene</option>
            <option value="reference">Research</option>
          </select>
        </label>
        <button className="action-secondary" disabled={busy || !documentId}>
          Add to project
        </button>
      </form>
      <div>
        <h2 className="mb-3 font-display text-xl">Reading order</h2>
        <p className="mb-3 text-xs text-ink/60">
          Drag to reorder, or use Move up and Move down. Removing an entry keeps
          its writing in the library.
        </p>
        <ol
          aria-label="Project reading order"
          className="divide-y divide-canvas-line border-y border-canvas-line"
        >
          {project.items.map((item, index) => {
            const doc = byId.get(item.documentId)
            return (
              <li
                key={item.documentId}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', item.documentId)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const dragged = event.dataTransfer.getData('text/plain')
                  if (
                    project.items.some((entry) => entry.documentId === dragged)
                  )
                    void run(() =>
                      moveProjectItem(project.id, dragged, item.documentId),
                    )
                }}
                className="flex flex-wrap items-center gap-3 py-4"
              >
                <span className="w-6 text-sm text-ink/40">{index + 1}</span>
                <div className="min-w-0 flex-1 basis-[80%] sm:basis-0">
                  {doc ? (
                    <Link
                      to={documentPath(doc)}
                      className="font-display text-lg text-ink hover:text-indigo"
                    >
                      {doc.title || 'Untitled'}
                    </Link>
                  ) : (
                    <span className="text-sm text-ink/50">
                      Unavailable writing{' '}
                      <Link className="underline" to="/trash">
                        Check Trash
                      </Link>
                    </span>
                  )}
                </div>
                <select
                  aria-label={`Role for ${doc?.title || 'unavailable writing'}`}
                  className="field-input w-auto text-xs"
                  value={item.role}
                  disabled={busy}
                  onChange={(event) =>
                    void run(() =>
                      setProjectRole(
                        project.id,
                        item.documentId,
                        event.target.value as ProjectRole,
                      ),
                    )
                  }
                >
                  <option value="chapter">Chapter</option>
                  <option value="scene">Scene</option>
                  <option value="reference">Research</option>
                </select>
                <div className="flex gap-2 text-xs">
                  <button
                    className="quiet-button"
                    disabled={busy || index === 0}
                    aria-label={`Move ${doc?.title || 'entry'} up`}
                    onClick={() => void move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    className="quiet-button"
                    disabled={busy || index === project.items.length - 1}
                    aria-label={`Move ${doc?.title || 'entry'} down`}
                    onClick={() => void move(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    className="quiet-button"
                    disabled={busy}
                    aria-label={`Remove ${doc?.title || 'entry'} from project`}
                    onClick={() =>
                      void run(() =>
                        removeProjectItem(project.id, item.documentId),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
        {!project.items.length && (
          <p className="py-6 text-sm text-ink/60">
            Add your first chapter, scene, or research Idea.
          </p>
        )}
      </div>
      <button
        className="text-sm text-berry hover:underline"
        disabled={busy}
        onClick={() => {
          if (
            window.confirm(
              'Remove this project? All its writing and versions will stay in your library.',
            )
          )
            void run(async () => {
              await deleteProject(project.id)
              navigate('/projects')
            })
        }}
      >
        Remove project
      </button>
    </section>
  )
}
