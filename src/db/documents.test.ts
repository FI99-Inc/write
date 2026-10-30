import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, Sonnet5DB } from '@/db/schema'
import {
  createDocument,
  listDocuments,
  purgeDocument,
  restoreDocument,
  listOrphanedHistory,
  recoverHistory,
} from '@/db/documents'
import { deletePoem, updatePoem } from '@/db/poems'
import { createStory, deleteStory, restoreStorySnapshot, updateStory } from '@/db/stories'
import { createSnapshot } from '@/db/snapshots'
import { exportLibrary, importLibrary } from '@/db/libraryExport'
import { createCollection, deleteCollection } from '@/db/collections'
import { docToPlainText } from '@/engines/richText/projection'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('document lifecycle', () => {
  it('keeps Ideas distinct from story type and idea status', async () => {
    await createDocument('poem')
    await createDocument('story')
    const idea = await createDocument('idea')
    expect((await listDocuments()).map((doc) => doc.kind).sort()).toEqual(['idea', 'poem', 'story'])
    expect(idea.status).toBe('draft')
  })
  it('moves writing and history to Trash, then restores both', async () => {
    const idea = await createDocument('idea')
    await createSnapshot(idea.id, 'Idea', 'a saved version')
    await deleteStory(idea.id)
    expect(await listDocuments()).toHaveLength(0)
    expect((await listDocuments(true))[0].kind).toBe('idea')
    expect(await db.snapshots.count()).toBe(1)
    await restoreDocument(idea)
    expect(await listDocuments()).toHaveLength(1)
    expect(await listDocuments(true)).toHaveLength(0)
    expect(await db.snapshots.count()).toBe(1)
  })
  it('only purges trashed writing and deletes its entire history', async () => {
    const poem = await createDocument('poem')
    await createSnapshot(poem.id, 'Poem', 'history')
    await expect(purgeDocument(poem)).rejects.toThrow('Trash')
    expect(await db.snapshots.count()).toBe(1)
    await deletePoem(poem.id)
    await purgeDocument(poem)
    expect(await db.poems.get(poem.id)).toBeUndefined()
    expect(await db.snapshots.count()).toBe(0)
  })
  it('backs up and reimports Ideas and Trash with their history', async () => {
    const idea = await createDocument('idea')
    await createSnapshot(idea.id, 'Idea', 'saved')
    await deleteStory(idea.id)
    const backup = await exportLibrary()
    await Promise.all(db.tables.map((table) => table.clear()))
    await importLibrary(backup)
    expect(await listDocuments()).toHaveLength(0)
    expect((await listDocuments(true))[0].kind).toBe('idea')
    expect(await db.snapshots.count()).toBe(1)
  })
  it('cleans collection membership from poems, stories, Ideas and Trash', async () => {
    const collection = await createCollection('Shared')
    const poem = await createDocument('poem')
    const idea = await createDocument('idea')
    await updatePoem(poem.id, { collectionIds: [collection.id, 'another'] })
    await updateStory(idea.id, { collectionIds: [collection.id, 'another'] })
    await deleteStory(idea.id)
    await deleteCollection(collection.id)
    expect((await db.poems.get(poem.id))?.collectionIds).toEqual(['another'])
    expect((await db.stories.get(idea.id))?.collectionIds).toEqual(['another'])
  })
  it('recovers orphaned old history without changing its owner identity', async () => {
    const snapshot = await createSnapshot('old-deleted', 'Old writing', 'still recoverable')
    expect(await listOrphanedHistory()).toHaveLength(1)
    await recoverHistory(snapshot, 'story')
    expect(await listOrphanedHistory()).toHaveLength(0)
    expect((await db.stories.get('old-deleted'))?.body).toBe('still recoverable')
    expect((await db.snapshots.get(snapshot.id))?.poemId).toBe('old-deleted')
  })
  it('restores a rich document and its comment threads together', async () => {
    const story = await createStory('Commented', 'rich')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'anchor',
              marks: [{ type: 'comment', attrs: { commentId: 'c' } }],
            },
          ],
        },
      ],
    }
    const comments = [{ id: 'c', text: 'keep this', resolved: false, createdAt: 1 }]
    const version = await createSnapshot(
      story.id,
      'Commented',
      'anchor',
      undefined,
      content,
      comments,
    )
    await updateStory(story.id, {
      body: 'different',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      comments: [],
    })
    await restoreStorySnapshot(version.id)
    const restored = await db.stories.get(story.id)
    expect(restored?.comments).toEqual(comments)
    expect(docToPlainText(restored!.content!)).toBe('anchor')
  })
})

describe('library compatibility', () => {
  it('rejects malformed backups before writes and accepts version 1 without stories', async () => {
    await createDocument('poem')
    await expect(importLibrary({ poems: [] })).rejects.toThrow()
    expect(await db.poems.count()).toBe(1)
    const legacy = { ...(await exportLibrary()), version: 1, stories: undefined }
    await expect(importLibrary(legacy)).resolves.toBeDefined()
  })
  it('remaps a colliding custom form and its imported poems together', async () => {
    const form = {
      id: 'form',
      name: 'Mine',
      description: '',
      example: '',
      lineRules: [{ syllables: 5 }],
      stanzaLineCounts: [1],
      isCustom: true,
    }
    await db.customForms.add(form)
    const poem = await createDocument('poem')
    await updatePoem(poem.id, { formId: form.id })
    const backup = await exportLibrary()
    await db.customForms.update(form.id, { name: 'Changed' })
    await importLibrary(backup)
    const copy = await db.poems.filter((doc) => doc.id !== poem.id).first()
    expect(copy?.formId).not.toBe(form.id)
    expect((await db.customForms.get(copy!.formId!))?.name).toBe('Mine')
  })
  it('upgrades a real version-7 IndexedDB library without rewriting writing', async () => {
    const name = `legacy-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(7).stores({
      poems: 'id, title, createdAt, modifiedAt, status, favorite, *tags, *collectionIds',
      stories: 'id, title, createdAt, modifiedAt, status, favorite, *tags, *collectionIds',
      wordOverrides: 'word',
      snapshots: 'id, poemId, createdAt',
      customForms: 'id, name',
      collections: 'id, name, createdAt',
    })
    await legacy
      .table('stories')
      .add({ id: 'legacy', title: 'Before update', body: 'keep me', createdAt: 1, modifiedAt: 2 })
    legacy.close()
    const upgraded = new Sonnet5DB(name)
    try {
      const document = await upgraded.stories.get('legacy')
      expect(document?.body).toBe('keep me')
      expect(document?.deletedAt).toBeUndefined()
      expect(document?.kind).toBeUndefined()
      expect(upgraded.verno).toBe(8)
    } finally {
      await upgraded.delete()
    }
  })
})

it('does not invalidate failed text recovery when metadata is changed', async () => {
  const { createDocumentWriter, readRecovery } = await import('@/engines/documentWriter')
  const poem = await createDocument('poem')
  await updatePoem(poem.id, { body: 'persisted', draftSavedAt: 10 })
  const writer = createDocumentWriter(
    async () => {
      throw new Error('disk full')
    },
    () => {},
  )
  writer.schedule(poem.id, { title: poem.title, body: 'last unsaved text' })
  await writer.flush()
  await updatePoem(poem.id, { favorite: true })
  const stored = (await db.poems.get(poem.id))!
  expect(stored.draftSavedAt).toBe(10)
  expect(readRecovery(poem.id, stored.draftSavedAt!)).toEqual({
    title: poem.title,
    body: 'last unsaved text',
  })
})

it('rejects dangerous rich attributes and unbounded meter work before any writes', async () => {
  const story = await createStory('Safe', 'rich')
  const backup = await exportLibrary()
  backup.stories[0].content = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'unsafe', marks: [{ type: 'link', attrs: { href: 123 } }] },
        ],
      },
    ],
  }
  await expect(importLibrary(backup)).rejects.toThrow('link href')
  expect(await db.stories.count()).toBe(1)
  expect((await db.stories.get(story.id))?.title).toBe('Safe')
  const poem = await createDocument('poem')
  const hostile = await exportLibrary()
  hostile.poems[0].targetMeter = { foot: 'iamb', feet: 1e308 }
  await expect(importLibrary(hostile)).rejects.toThrow('meter')
  expect(await db.poems.get(poem.id)).toBeDefined()
})

it('accepts safely readable old fractional form rules without losing any writing', async () => {
  await createDocument('poem')
  const backup = await exportLibrary()
  backup.version = 1
  backup.customForms.push({
    id: 'old-form',
    name: 'Old form',
    description: '',
    example: '',
    lineRules: [{ syllables: 2.5, refrainOf: 0.5 }],
    stanzaLineCounts: [0],
  })
  await expect(importLibrary(backup)).resolves.toBeDefined()
  expect((await db.customForms.get('old-form'))?.lineRules[0].syllables).toBe(2.5)
})

it('removes orphaned legacy comment marks while preserving the writing and detached notes', async () => {
  const story = await createStory('Legacy', 'rich')
  const legacyContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'still here',
            marks: [{ type: 'comment', attrs: { commentId: 'missing' } }],
          },
        ],
      },
    ],
  }
  const version = await createSnapshot(story.id, 'Legacy', 'still here', undefined, legacyContent)
  await restoreStorySnapshot(version.id)
  const restored = (await db.stories.get(story.id))!
  expect(JSON.stringify(restored.content)).not.toContain('missing')
  expect(restored.body).toBe('still here')
})

it('can confirm a rich import after preview canonicalization without rejecting shared schema attributes', async () => {
  const { parseLibraryExport } = await import('@/db/validateLibrary')
  const story = await createStory('Rich backup', 'rich')
  const content = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'second' }] },
    ],
  }
  await updateStory(story.id, { content, body: 'first\n\nsecond' })
  const preview = await parseLibraryExport(JSON.parse(JSON.stringify(await exportLibrary())))
  await expect(importLibrary(preview)).resolves.toBeDefined()
  expect(await db.stories.count()).toBe(2)
  const cyclic: Record<string, unknown> = { ...preview }
  cyclic.extra = cyclic
  await expect(importLibrary(cyclic)).rejects.toThrow('acyclic')
})
