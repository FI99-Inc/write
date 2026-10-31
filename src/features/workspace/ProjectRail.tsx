import { memo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { createProjectWriting } from '@/db/projects'
import { useSettings } from '@/engines/useSettings'
import { documentPath, type DocKind, type LibraryDoc } from '@/types/libraryDoc'
import { Glyph } from './Glyph'

type Entry = Pick<LibraryDoc, 'id' | 'title' | 'kind'> & { role?: string }
const kindName = (kind: DocKind) =>
  kind === 'idea' ? 'Idea' : kind === 'story' ? 'Story' : 'Poem'

/** The rail never requests every manuscript in the library. */
export const ProjectRail = memo(function ProjectRail({
  documentId,
  onNavigate,
}: {
  documentId: string
  onNavigate: () => void
}) {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const projects = useLiveQuery(
    () =>
      db.projects
        .filter((project) =>
          project.items.some((item) => item.documentId === documentId),
        )
        .toArray(),
    [documentId],
  )
  const [selectedProject, setSelectedProject] = useState('')
  const project =
    projects?.find((entry) => entry.id === selectedProject) ?? projects?.[0]
  const entries = useLiveQuery(async (): Promise<Entry[]> => {
    if (project) {
      const [poems, stories] = await Promise.all([
        db.poems.bulkGet(
          project.items
            .filter((item) => item.kind === 'poem')
            .map((item) => item.documentId),
        ),
        db.stories.bulkGet(
          project.items
            .filter((item) => item.kind !== 'poem')
            .map((item) => item.documentId),
        ),
      ])
      const available = new Map(
        [...poems, ...stories]
          .filter((doc) => doc && !doc.deletedAt)
          .map((doc) => [doc!.id, doc!]),
      )
      return project.items.flatMap((item) => {
        const doc = available.get(item.documentId)
        return doc
          ? [{ id: doc.id, title: doc.title, kind: item.kind, role: item.role }]
          : []
      })
    }
    const [poems, stories] = await Promise.all([
      db.poems
        .orderBy('modifiedAt')
        .reverse()
        .filter((doc) => !doc.deletedAt)
        .limit(20)
        .toArray(),
      db.stories
        .orderBy('modifiedAt')
        .reverse()
        .filter((doc) => !doc.deletedAt)
        .limit(20)
        .toArray(),
    ])
    return [
      ...poems.map((doc) => ({ ...doc, kind: 'poem' as const })),
      ...stories.map((doc) => ({
        ...doc,
        kind: doc.kind ?? ('story' as const),
      })),
    ]
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
      .slice(0, 20)
      .map(({ id, title, kind }) => ({ id, title, kind }))
  }, [project])
  const writing =
    entries?.filter(
      (entry) => entry.kind !== 'idea' && entry.role !== 'reference',
    ) ?? []
  const research =
    entries?.filter(
      (entry) => entry.kind === 'idea' || entry.role === 'reference',
    ) ?? []
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function create(kind: DocKind) {
    if (!project || busy) return
    setBusy(true)
    setError('')
    try {
      const doc = await createProjectWriting(
        project.id,
        kind,
        kind === 'idea' ? 'reference' : 'chapter',
        settings.storyEditorMode,
      )
      onNavigate()
      navigate(documentPath(doc))
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not create writing.',
      )
    } finally {
      setBusy(false)
    }
  }
  function rows(items: Entry[], numbered: boolean) {
    return (
      <ol className="wr-file-list">
        {items.map((doc, index) => (
          <li key={doc.id}>
            <Link
              to={documentPath(doc)}
              onClick={onNavigate}
              title={doc.title || 'Untitled'}
              aria-current={doc.id === documentId ? 'page' : undefined}
            >
              {numbered ? (
                <span className="wr-order">{index + 1}</span>
              ) : (
                <Glyph name="write" />
              )}
              <span>
                <strong>{doc.title || 'Untitled'}</strong>
                <small>{kindName(doc.kind)}</small>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <div className="wr-project-rail">
      <nav className="wr-drawer-nav" aria-label="Workspace navigation">
        <Link to="/" onClick={onNavigate}>
          <Glyph name="library" />
          Library
        </Link>
        <Link to="/projects" onClick={onNavigate}>
          <Glyph name="project" />
          Projects
        </Link>
      </nav>
      <div className="wr-project-name">
        {projects && projects.length > 1 && (
          <label className="field-label">
            Project
            <select
              className="field-input"
              value={project?.id}
              onChange={(event) => setSelectedProject(event.target.value)}
            >
              {projects.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <h2>
          {project ? (
            <Link to={`/projects/${project.id}`} onClick={onNavigate}>
              {project.name}
            </Link>
          ) : (
            'Your writing'
          )}
        </h2>
        <p>
          {project
            ? (['poem', 'story', 'idea'] as const)
                .map((kind) => {
                  const count =
                    entries?.filter((doc) => doc.kind === kind).length ?? 0
                  return count
                    ? `${count} ${count === 1 ? kind : kind === 'story' ? 'stories' : `${kind}s`}`
                    : ''
                })
                .filter(Boolean)
                .join(', ')
            : 'Recent writing from your library'}
        </p>
        {!project && projects !== undefined && (
          <Link className="wr-text-link" to="/projects" onClick={onNavigate}>
            Organize a project
          </Link>
        )}
      </div>
      <div className="wr-rail-label">
        <h3>{project ? 'Writing' : 'Recent writing'}</h3>
        {project && (
          <button
            type="button"
            aria-label="Add project writing"
            aria-expanded={adding}
            onClick={() => setAdding(!adding)}
          >
            <Glyph name="plus" />
          </button>
        )}
      </div>
      {adding && (
        <div className="wr-add-writing">
          {(['poem', 'story', 'idea'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={busy}
              onClick={() => void create(kind)}
            >
              New {kind}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="wr-rail-error">
          {error}
        </p>
      )}
      {entries === undefined ? (
        <p role="status" className="wr-rail-empty">
          Loading writing…
        </p>
      ) : (
        rows(writing, true)
      )}
      {!writing.length && entries && (
        <p className="wr-rail-empty">No poems or stories here yet.</p>
      )}
      <div className="wr-rail-label">
        <h3>Ideas &amp; research</h3>
        {project && (
          <button
            type="button"
            aria-label="New project idea"
            disabled={busy}
            onClick={() => void create('idea')}
          >
            <Glyph name="plus" />
          </button>
        )}
      </div>
      {rows(research, false)}
      {!research.length && entries && (
        <p className="wr-rail-empty">
          Keep notes and fragments alongside your writing.
        </p>
      )}
      <nav className="wr-rail-bottom" aria-label="Library utilities">
        <Link to="/?find=1" onClick={onNavigate}>
          <Glyph name="search" />
          Find writing
        </Link>
        <Link to="/backups" onClick={onNavigate}>
          <Glyph name="history" />
          Backups
        </Link>
        <Link to="/trash" onClick={onNavigate}>
          Trash
        </Link>
      </nav>
    </div>
  )
})
