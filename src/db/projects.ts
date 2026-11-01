import { createDocument } from '@/db/documents'
import type { DocKind } from '@/types/libraryDoc'
import type { StoryFormat } from '@/types/story'
import { db } from '@/db/schema'
import type { Project, ProjectItem, ProjectRole } from '@/types/project'

export async function createProject(name: string, description = ''): Promise<Project> {
  if (!name.trim()) throw new Error('Give your project a name.')
  const now = Date.now()
  const project: Project = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: now,
    modifiedAt: now,
    items: [],
  }
  await db.projects.add(project)
  return project
}

export function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('modifiedAt').reverse().toArray()
}

/** Read-modify-write operations share a transaction so tabs cannot lose each other's edits. */
async function editProject(
  id: string,
  change: (project: Project) => Partial<Project>,
): Promise<void> {
  await db.transaction('rw', db.projects, async () => {
    const project = await db.projects.get(id)
    if (!project) throw new Error('This project is no longer available.')
    await db.projects.update(id, { ...change(project), modifiedAt: Date.now() })
  })
}

export function renameProject(id: string, name: string, description: string): Promise<void> {
  if (!name.trim()) return Promise.reject(new Error('Give your project a name.'))
  return editProject(id, () => ({ name: name.trim(), description: description.trim() }))
}

export async function addProjectItem(id: string, item: ProjectItem): Promise<void> {
  await db.transaction('rw', db.projects, db.poems, db.stories, async () => {
    const doc = await (item.kind === 'poem' ? db.poems : db.stories).get(item.documentId)
    if (!doc || doc.deletedAt) throw new Error('Choose writing that is available in your library.')
    await editProject(id, (project) => ({
      items: project.items.some((entry) => entry.documentId === item.documentId)
        ? project.items
        : [...project.items, item],
    }))
  })
}

export function removeProjectItem(id: string, documentId: string): Promise<void> {
  return editProject(id, (project) => ({
    items: project.items.filter((item) => item.documentId !== documentId),
  }))
}

export function setProjectRole(id: string, documentId: string, role: ProjectRole): Promise<void> {
  return editProject(id, (project) => ({
    items: project.items.map((item) => (item.documentId === documentId ? { ...item, role } : item)),
  }))
}

/** Move relative to another stable id; stale UI positions never drop or duplicate items. */
export function moveProjectItem(
  id: string,
  documentId: string,
  beforeId: string | null,
): Promise<void> {
  return editProject(id, (project) => {
    const item = project.items.find((entry) => entry.documentId === documentId)
    if (!item || beforeId === documentId) return {}
    const items = project.items.filter((entry) => entry.documentId !== documentId)
    const index =
      beforeId === null ? items.length : items.findIndex((entry) => entry.documentId === beforeId)
    if (index < 0) return {}
    items.splice(index, 0, item)
    return { items }
  })
}

/** Removing a project never removes its writing or versions. */
export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id)
}

export function createProjectWriting(
  projectId: string,
  kind: DocKind,
  role: ProjectRole,
  format: StoryFormat = 'rich',
) {
  return db.transaction('rw', [db.projects, db.poems, db.stories], async () => {
    const doc = await createDocument(kind, format)
    await addProjectItem(projectId, { documentId: doc.id, kind, role })
    return doc
  })
}
