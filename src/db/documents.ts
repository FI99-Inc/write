import { db } from '@/db/schema'
import { createPoem } from '@/db/poems'
import { createStory } from '@/db/stories'
import {
  poemToLibraryDoc,
  storyToLibraryDoc,
  type DocKind,
  type LibraryDoc,
} from '@/types/libraryDoc'
import type { StoryFormat } from '@/types/story'
import type { Snapshot } from '@/types/snapshot'

export async function createDocument(
  kind: DocKind,
  format: StoryFormat = 'rich',
): Promise<LibraryDoc> {
  return kind === 'poem'
    ? poemToLibraryDoc(await createPoem())
    : storyToLibraryDoc(await createStory('Untitled', format, kind))
}

export async function listDocuments(trashed = false): Promise<LibraryDoc[]> {
  const documents: LibraryDoc[] = []
  await Promise.all([
    db.poems
      .filter((doc) => Boolean(doc.deletedAt) === trashed)
      .each((doc) => {
        documents.push(poemToLibraryDoc(doc))
      }),
    db.stories
      .filter((doc) => Boolean(doc.deletedAt) === trashed)
      .each((doc) => {
        documents.push(storyToLibraryDoc(doc))
      }),
  ])
  return documents.sort((a, b) =>
    trashed ? b.deletedAt! - a.deletedAt! : b.modifiedAt - a.modifiedAt,
  )
}

export async function restoreDocument(doc: Pick<LibraryDoc, 'kind' | 'id'>): Promise<void> {
  const table = doc.kind === 'poem' ? db.poems : db.stories
  await table.update(doc.id, { deletedAt: undefined })
}

/** The only destructive document operation: its caller must confirm permanent deletion. */
export async function purgeDocument(doc: Pick<LibraryDoc, 'kind' | 'id'>): Promise<void> {
  const table = doc.kind === 'poem' ? db.poems : db.stories
  await db.transaction('rw', table, db.snapshots, async () => {
    const current = await table.get(doc.id)
    if (!current?.deletedAt)
      throw new Error('Move this writing to Trash before deleting it permanently.')
    await db.snapshots.where('poemId').equals(doc.id).delete()
    await table.delete(doc.id)
  })
}

/** Older app versions deleted document rows without their history. Never discard it silently. */
export async function listOrphanedHistory(): Promise<Snapshot[]> {
  const [poems, stories] = await Promise.all([
    db.poems.toCollection().primaryKeys(),
    db.stories.toCollection().primaryKeys(),
  ])
  const owners = new Set([...poems, ...stories])
  const latest = new Map<string, Snapshot>()
  await db.snapshots.each((snapshot) => {
    if (
      !owners.has(snapshot.poemId) &&
      (!latest.has(snapshot.poemId) || latest.get(snapshot.poemId)!.createdAt < snapshot.createdAt)
    )
      latest.set(snapshot.poemId, snapshot)
  })
  return [...latest.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export async function recoverHistory(snapshot: Snapshot, kind: 'poem' | 'story'): Promise<void> {
  await db.transaction('rw', db.poems, db.stories, async () => {
    if ((await db.poems.get(snapshot.poemId)) || (await db.stories.get(snapshot.poemId))) return
    const document = {
      id: snapshot.poemId,
      title: snapshot.title,
      body: snapshot.body,
      createdAt: snapshot.createdAt,
      modifiedAt: snapshot.createdAt,
      status: 'draft' as const,
    }
    if (kind === 'poem') await db.poems.add(document)
    else
      await db.stories.add({
        ...document,
        kind,
        format: snapshot.content ? 'rich' : 'plain',
        content: snapshot.content,
        comments: snapshot.comments ?? [],
      })
  })
}

export async function setDocumentCollection(
  doc: Pick<LibraryDoc, 'kind' | 'id'>,
  collectionId: string,
  selected: boolean,
): Promise<void> {
  const table = doc.kind === 'poem' ? db.poems : db.stories
  await db.transaction('rw', table, db.collections, async () => {
    const [current, collection] = await Promise.all([
      table.get(doc.id),
      db.collections.get(collectionId),
    ])
    if (!current || !collection)
      throw new Error('This writing or collection is no longer available.')
    const memberships = new Set(current.collectionIds ?? [])
    if (selected) memberships.add(collectionId)
    else memberships.delete(collectionId)
    await table.update(doc.id, { collectionIds: [...memberships], modifiedAt: Date.now() })
  })
}
