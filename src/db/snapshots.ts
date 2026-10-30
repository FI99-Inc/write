import { db } from '@/db/schema'
import { getPoem, updatePoem } from '@/db/poems'
import type { JSONContent } from '@tiptap/core'
import type { StoryComment } from '@/types/story'
import type { Snapshot } from '@/types/snapshot'

export async function createSnapshot(
  poemId: string,
  title: string,
  body: string,
  label?: string,
  content?: JSONContent,
  comments?: StoryComment[],
): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    poemId,
    title,
    body,
    createdAt: Date.now(),
    ...(label !== undefined ? { label } : {}),
    ...(content !== undefined ? { content } : {}),
    ...(comments !== undefined ? { comments } : {}),
  }
  await db.snapshots.add(snapshot)
  return snapshot
}

export async function listSnapshots(poemId: string): Promise<Snapshot[]> {
  const snapshots = await db.snapshots.where('poemId').equals(poemId).toArray()
  return snapshots.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  const snapshot = await db.snapshots.get(id)
  return snapshot ?? null
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.snapshots.delete(id)
}

/**
 * Restores a poem to a prior snapshot. Takes a safety snapshot of the
 * poem's current state first (labeled "Before restore"), so restoring is
 * itself always reversible from the history list.
 */
export async function restoreSnapshot(id: string): Promise<void> {
  await db.transaction('rw', db.poems, db.snapshots, async () => {
    const snapshot = await getSnapshot(id)
    if (!snapshot) return
    const current = await getPoem(snapshot.poemId)
    if (!current) return
    await createSnapshot(current.id, current.title, current.body, 'Before restore')
    await updatePoem(current.id, { title: snapshot.title, body: snapshot.body })
  })
}
