import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/schema'
import { createStory, updateStory } from '@/db/stories'
import { createPoem, updatePoem } from '@/db/poems'
import { createSnapshot } from '@/db/snapshots'
import { restorePassage } from '@/db/revisions'
beforeEach(async () => {
  await Promise.all([db.poems.clear(), db.stories.clear(), db.snapshots.clear()])
})
describe('selective revision restoration', () => {
  it('restores only chosen lines and captures a safety version', async () => {
    const poem = await createPoem()
    const version = await createSnapshot(poem.id, 'Old', 'first\nold\nlast', 'Before revision')
    await updatePoem(poem.id, { body: 'first\nnew\nlast', draftSavedAt: 77 })
    await restorePassage({
      id: poem.id,
      kind: 'poem',
      snapshotId: version.id,
      source: { from: 2, to: 2 },
      target: { from: 2, to: 2 },
      expectedSavedAt: 77,
      expectedBody: 'first\nnew\nlast',
    })
    expect((await db.poems.get(poem.id))?.body).toBe('first\nold\nlast')
    expect(
      (await db.snapshots.where('poemId').equals(poem.id).toArray()).find(
        (snapshot) => snapshot.label === 'Before passage restore',
      )?.body,
    ).toBe('first\nnew\nlast')
  })
  it('preserves formatting and copies selected comment threads under fresh ids', async () => {
    const story = await createStory('Text', 'rich')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Old',
              marks: [{ type: 'bold' }, { type: 'comment', attrs: { commentId: 'c' } }],
            },
          ],
        },
      ],
    }
    const version = await createSnapshot(story.id, 'Text', 'Old', 'Old', content, [
      { id: 'c', text: 'Source note', createdAt: 1, resolved: false },
    ])
    await updateStory(story.id, {
      body: 'New',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New' }] }],
      },
      comments: [{ id: 'c', text: 'Current note', createdAt: 1, resolved: false }],
      draftSavedAt: 78,
    })
    await restorePassage({
      id: story.id,
      kind: 'story',
      snapshotId: version.id,
      source: { from: 1, to: 1 },
      target: { from: 1, to: 0 },
      expectedSavedAt: 78,
      expectedBody: 'New',
    })
    const restored = await db.stories.get(story.id)
    expect(restored?.body).toBe('Old\n\nNew')
    expect(restored?.comments).toHaveLength(2)
    expect(restored?.comments?.find((comment) => comment.id === 'c')?.text).toBe('Current note')
    expect(restored?.content?.content?.[0].content?.[0].marks).toContainEqual({ type: 'bold' })
  })
  it('rejects stale content and invalid ranges without touching history', async () => {
    const poem = await createPoem(),
      version = await createSnapshot(poem.id, 'Old', 'Old')
    await expect(
      restorePassage({
        id: poem.id,
        kind: 'poem',
        snapshotId: version.id,
        source: { from: 1, to: 1 },
        target: { from: 1, to: 1 },
        expectedSavedAt: 0,
        expectedBody: '',
      }),
    ).rejects.toThrow('changed')
    const current = (await db.poems.get(poem.id))!
    await expect(
      restorePassage({
        id: poem.id,
        kind: 'poem',
        snapshotId: version.id,
        source: { from: 2, to: 1 },
        target: { from: 1, to: 1 },
        expectedSavedAt: current.modifiedAt,
        expectedBody: '',
      }),
    ).rejects.toThrow('range')
    expect(await db.snapshots.count()).toBe(1)
  })
})
