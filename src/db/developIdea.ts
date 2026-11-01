import { db } from '@/db/schema'
import { createSnapshot } from '@/db/snapshots'
import { poemToLibraryDoc, storyToLibraryDoc, type LibraryDoc } from '@/types/libraryDoc'
import type { Poem } from '@/types/poem'
import type { Story } from '@/types/story'

/** Development is a linked copy: even prose-to-poem development cannot erase rich source notes. */
export async function developIdea(id: string, kind: 'poem' | 'story'): Promise<LibraryDoc> {
  return db.transaction('rw', [db.poems, db.stories, db.snapshots, db.projects], async () => {
    const source = await db.stories.get(id)
    if (!source || source.kind !== 'idea' || source.deletedAt)
      throw new Error('This Idea is no longer available.')
    const now = Date.now()
    const common = {
      id: crypto.randomUUID(),
      sourceIdeaId: id,
      title: source.title,
      body: source.body,
      createdAt: now,
      modifiedAt: now,
      draftSavedAt: now,
      tags: source.tags,
      status: source.status,
      favorite: source.favorite,
      collectionIds: source.collectionIds,
    }
    let result: LibraryDoc
    if (kind === 'poem') {
      const poem: Poem = common
      await db.poems.add(poem)
      result = poemToLibraryDoc(poem)
    } else {
      const story: Story = {
        ...common,
        kind: 'story',
        format: source.format,
        content: source.content,
        comments: source.comments,
      }
      await db.stories.add(story)
      result = storyToLibraryDoc(story)
    }
    const versions = await db.snapshots.where('poemId').equals(id).toArray()
    await db.snapshots.bulkAdd(
      versions.map((version) => ({ ...version, id: crypto.randomUUID(), poemId: common.id })),
    )
    await createSnapshot(
      common.id,
      source.title,
      source.body,
      'Developed from Idea',
      source.content,
      source.comments,
    )
    const projects = await db.projects
      .filter((project) => project.items.some((item) => item.documentId === id))
      .toArray()
    for (const project of projects) {
      const items = [...project.items]
      items.splice(items.findIndex((item) => item.documentId === id) + 1, 0, {
        documentId: common.id,
        kind,
        role: 'chapter',
      })
      await db.projects.update(project.id, { items, modifiedAt: now })
    }
    return result
  })
}
