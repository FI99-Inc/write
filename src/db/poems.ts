import { db } from '@/db/schema'
import type { Poem } from '@/types/poem'

export async function createPoem(title = 'Untitled'): Promise<Poem> {
  const now = Date.now()
  const poem: Poem = {
    id: crypto.randomUUID(),
    title,
    body: '',
    createdAt: now,
    modifiedAt: now,
    status: 'draft',
    favorite: false,
    tags: [],
    collectionIds: [],
  }
  await db.poems.add(poem)
  return poem
}

export async function getPoem(id: string): Promise<Poem | null> {
  const poem = await db.poems.get(id)
  return poem && !poem.deletedAt ? poem : null
}

export function listPoems(): Promise<Poem[]> {
  return db.poems
    .orderBy('modifiedAt')
    .reverse()
    .filter((doc) => !doc.deletedAt)
    .toArray()
}

export async function updatePoem(
  id: string,
  changes: Partial<Omit<Poem, 'id' | 'createdAt'>>,
): Promise<void> {
  const now = Date.now()
  const writingChanged = ['title', 'body', 'content', 'comments'].some((key) =>
    Object.hasOwn(changes, key),
  )
  await db.poems.update(id, {
    ...changes,
    modifiedAt: now,
    ...(writingChanged && changes.draftSavedAt === undefined ? { draftSavedAt: now } : {}),
  })
}

export async function deletePoem(id: string): Promise<void> {
  await db.poems.update(id, { deletedAt: Date.now() })
}
