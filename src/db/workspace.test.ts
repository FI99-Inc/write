import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/schema'
import { createStory, updateStory } from '@/db/stories'
import { createSnapshot } from '@/db/snapshots'
import { developIdea } from '@/db/developIdea'
import { addProjectItem, createProject, deleteProject, moveProjectItem } from '@/db/projects'
import { exportLibrary, importLibrary } from '@/db/libraryExport'

beforeEach(async () => {
  await Promise.all([
    db.poems.clear(),
    db.stories.clear(),
    db.snapshots.clear(),
    db.projects.clear(),
    db.collections.clear(),
    db.customForms.clear(),
    db.wordOverrides.clear(),
  ])
})
describe('writing workspace integrity', () => {
  it('develops a rich Idea without losing source comments, versions, or project order', async () => {
    const idea = await createStory('Notes', 'rich', 'idea')
    const comments = [{ id: 'c', text: 'Keep this thought', resolved: false, createdAt: 1 }]
    await updateStory(idea.id, {
      body: 'A thought',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'A thought', marks: [{ type: 'bold' }] }],
          },
        ],
      },
      comments,
      tags: ['research'],
    })
    await createSnapshot(idea.id, idea.title, 'Earlier', 'First thought')
    const project = await createProject('Book')
    await addProjectItem(project.id, { documentId: idea.id, kind: 'idea', role: 'reference' })
    const poem = await developIdea(idea.id, 'poem')
    expect((await db.stories.get(idea.id))?.comments).toEqual(comments)
    expect(await db.poems.get(poem.id)).toMatchObject({
      sourceIdeaId: idea.id,
      body: 'A thought',
      tags: ['research'],
    })
    expect(await db.snapshots.where('poemId').equals(poem.id).count()).toBe(2)
    expect((await db.projects.get(project.id))?.items.map((item) => item.documentId)).toEqual([
      idea.id,
      poem.id,
    ])
    const story = await developIdea(idea.id, 'story')
    expect((await db.stories.get(story.id))?.comments).toEqual(comments)
  })
  it('moves project items by stable ids and deletes only the project', async () => {
    const a = await createStory('A'),
      b = await createStory('B'),
      c = await createStory('C')
    const project = await createProject('Book')
    for (const doc of [a, b, c])
      await addProjectItem(project.id, { documentId: doc.id, kind: 'story', role: 'chapter' })
    await addProjectItem(project.id, { documentId: a.id, kind: 'story', role: 'chapter' })
    await moveProjectItem(project.id, c.id, a.id)
    expect((await db.projects.get(project.id))?.items.map((item) => item.documentId)).toEqual([
      c.id,
      a.id,
      b.id,
    ])
    await deleteProject(project.id)
    expect(await db.stories.count()).toBe(3)
  })
  it('round-trips projects and source Idea links when every id collides', async () => {
    const idea = await createStory('Source', 'plain', 'idea')
    const story = await developIdea(idea.id, 'story')
    const project = await createProject('Book')
    await addProjectItem(project.id, { documentId: idea.id, kind: 'idea', role: 'reference' })
    await addProjectItem(project.id, { documentId: story.id, kind: 'story', role: 'chapter' })
    const data = await exportLibrary()
    const result = await importLibrary(data)
    expect(result.projectsAdded).toBe(1)
    const imported = (await db.projects.toArray()).find((row) => row.id !== project.id)!
    expect(imported.items.every((item) => ![idea.id, story.id].includes(item.documentId))).toBe(
      true,
    )
    const importedStory = await db.stories.get(imported.items[1].documentId)
    expect(importedStory?.sourceIdeaId).toBe(imported.items[0].documentId)
  })
  it('updates backup health only for the same folder generation', async () => {
    const { updateBackupPreferences, readBackupPreferences } =
      await import('@/engines/folderBackups')
    await db.backupPreferences.put({
      id: 'folder',
      value: { setId: 'new-folder', enabled: true, nextSlot: 0, intervalMinutes: 10 },
    })
    await updateBackupPreferences({ lastFilename: 'old-file.json', lastBackupAt: 42 }, 'old-folder')
    expect((await readBackupPreferences()).lastFilename).toBeUndefined()
    await updateBackupPreferences({ lastFilename: 'new-file.json', lastBackupAt: 43 }, 'new-folder')
    expect((await readBackupPreferences()).lastFilename).toBe('new-file.json')
  })
})
