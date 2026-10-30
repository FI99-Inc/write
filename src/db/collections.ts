import { db } from '@/db/schema'
import type { EntityTable } from 'dexie'
import type { Collection } from '@/types/collection'

export async function createCollection(name: string): Promise<Collection> {
  const collection: Collection = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
  }
  await db.collections.add(collection)
  return collection
}

export function listCollections(): Promise<Collection[]> {
  return db.collections.orderBy('name').toArray()
}

export async function renameCollection(id: string, name: string): Promise<void> {
  await db.collections.update(id, { name })
}

/** Collection removal preserves writing, including trashed documents. */
export async function deleteCollection(id: string): Promise<void> {
  await db.transaction('rw', db.collections, db.poems, db.stories, async () => {
    await db.collections.delete(id)
    await Promise.all([removeMembership(db.poems, id), removeMembership(db.stories, id)])
  })
}

function removeMembership<T extends { id: string; collectionIds?: string[] }>(
  table: EntityTable<T, 'id'>,
  id: string,
) {
  return table
    .where('collectionIds')
    .equals(id)
    .modify((doc) => {
      doc.collectionIds = (doc.collectionIds ?? []).filter((cid) => cid !== id)
    })
}
