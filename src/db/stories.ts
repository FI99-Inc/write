import { EMPTY_DOC } from '@/engines/richText/emptyDoc'
import { db } from '@/db/schema'
import { createSnapshot, getSnapshot } from '@/db/snapshots'
import type { Story, StoryFormat } from '@/types/story'

export async function createStory(
  title = 'Untitled',
  format: StoryFormat = 'plain',
  kind: 'story' | 'idea' = 'story',
): Promise<Story> {
  const now = Date.now()
  const story: Story = {
    id: crypto.randomUUID(),
    title,
    body: '',
    format,
    kind,
    ...(format === 'rich' ? { content: EMPTY_DOC, comments: [] } : {}),
    createdAt: now,
    modifiedAt: now,
    status: 'draft',
    favorite: false,
    tags: [],
    collectionIds: [],
  }
  await db.stories.add(story)
  return story
}

export async function getStory(id: string): Promise<Story | null> {
  const story = await db.stories.get(id)
  return story && !story.deletedAt ? story : null
}

export function listStories(): Promise<Story[]> {
  return db.stories
    .orderBy('modifiedAt')
    .reverse()
    .filter((doc) => !doc.deletedAt)
    .toArray()
}

export async function updateStory(
  id: string,
  changes: Partial<Omit<Story, 'id' | 'createdAt'>>,
): Promise<void> {
  const now = Date.now()
  const writingChanged = ['title', 'body', 'content', 'comments'].some((key) =>
    Object.hasOwn(changes, key),
  )
  await db.stories.update(id, {
    ...changes,
    modifiedAt: now,
    ...(writingChanged && changes.draftSavedAt === undefined ? { draftSavedAt: now } : {}),
  })
}

export async function deleteStory(id: string): Promise<void> {
  await db.stories.update(id, { deletedAt: Date.now() })
}

/** Restoring captures a safety version and keeps rich text and threads together. */
export async function restoreStorySnapshot(snapshotId: string): Promise<void> {
  const [{ plainTextToDoc, docToPlainText }, { reconcileCommentAnchors }] = await Promise.all([
    import('@/engines/richText/projection'),
    import('@/engines/richText/reconcileComments'),
  ])
  await db.transaction('rw', db.stories, db.snapshots, async () => {
    const snapshot = await getSnapshot(snapshotId)
    if (!snapshot) return
    const current = await getStory(snapshot.poemId)
    if (!current) return
    await createSnapshot(
      current.id,
      current.title,
      current.body,
      'Before restore',
      current.content,
      current.comments,
    )
    const rich = current.format === 'rich'
    const comments = snapshot.comments ?? current.comments ?? []
    const content = rich
      ? reconcileCommentAnchors(snapshot.content ?? plainTextToDoc(snapshot.body), comments)
      : undefined
    await updateStory(current.id, {
      title: snapshot.title,
      body: content ? docToPlainText(content) : snapshot.body,
      content,
      comments: rich ? comments : undefined,
    })
  })
}
