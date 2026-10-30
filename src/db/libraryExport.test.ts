import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/schema'
import { createPoem, getPoem, updatePoem } from '@/db/poems'
import { createStory } from '@/db/stories'
import { createSnapshot, listSnapshots } from '@/db/snapshots'
import { createCollection } from '@/db/collections'
import { setOverride } from '@/db/overrides'
import {
  exportLibrary,
  exportPoem,
  exportStory,
  exportCollection,
  importLibrary,
} from '@/db/libraryExport'

beforeEach(async () => {
  await db.poems.clear()
  await db.stories.clear()
  await db.snapshots.clear()
  await db.collections.clear()
  await db.wordOverrides.clear()
  await db.customForms.clear()
})

describe('exportLibrary', () => {
  it('exports every poem, story, snapshot, override, and collection', async () => {
    const poem = await createPoem('A')
    await createSnapshot(poem.id, 'A', 'v1')
    await createStory('A Story')
    await createCollection('Sonnets')
    await setOverride('fire', { syllables: 1 })

    const data = await exportLibrary()
    expect(data.poems).toHaveLength(1)
    expect(data.stories).toHaveLength(1)
    expect(data.snapshots).toHaveLength(1)
    expect(data.collections).toHaveLength(1)
    expect(data.wordOverrides).toHaveLength(1)
    expect(data.version).toBe(2)
  })
})

describe('exportStory', () => {
  it('exports a single story and only its own snapshots', async () => {
    const storyA = await createStory('A')
    const storyB = await createStory('B')
    await createSnapshot(storyA.id, 'A', 'v1')
    await createSnapshot(storyB.id, 'B', 'v1')

    const data = await exportStory(storyA.id)
    expect(data.stories).toEqual([expect.objectContaining({ id: storyA.id })])
    expect(data.snapshots).toHaveLength(1)
    expect(data.snapshots[0].poemId).toBe(storyA.id)
  })

  it('throws for a missing story', async () => {
    await expect(exportStory('does-not-exist')).rejects.toThrow()
  })
})

describe('exportPoem', () => {
  it('exports a single poem and only its own snapshots', async () => {
    const poemA = await createPoem('A')
    const poemB = await createPoem('B')
    await createSnapshot(poemA.id, 'A', 'v1')
    await createSnapshot(poemB.id, 'B', 'v1')

    const data = await exportPoem(poemA.id)
    expect(data.poems).toEqual([expect.objectContaining({ id: poemA.id })])
    expect(data.snapshots).toHaveLength(1)
    expect(data.snapshots[0].poemId).toBe(poemA.id)
  })

  it('throws for a missing poem', async () => {
    await expect(exportPoem('does-not-exist')).rejects.toThrow()
  })
})

describe('exportCollection', () => {
  it('exports a collection and only the poems that belong to it', async () => {
    const collection = await createCollection('Sonnets')
    const inCollection = await createPoem('In')
    const notInCollection = await createPoem('Out')
    await updatePoem(inCollection.id, { collectionIds: [collection.id] })

    const data = await exportCollection(collection.id)
    expect(data.poems.map((p) => p.id)).toEqual([inCollection.id])
    expect(data.poems.map((p) => p.id)).not.toContain(notInCollection.id)
    expect(data.collections).toEqual([collection])
  })
})

describe('importLibrary', () => {
  it('imports poems, snapshots, and collections with no id collisions as-is', async () => {
    const poem = await createPoem('A')
    await createSnapshot(poem.id, 'A', 'v1')
    const collection = await createCollection('Sonnets')
    await updatePoem(poem.id, { collectionIds: [collection.id] })
    const data = await exportLibrary()

    await db.poems.clear()
    await db.snapshots.clear()
    await db.collections.clear()

    const result = await importLibrary(data)
    expect(result).toEqual({
      poemsAdded: 1,
      storiesAdded: 0,
      ideasAdded: 0,
      collectionsAdded: 1,
      customFormsAdded: 0,
      wordOverridesAdded: 0,
      snapshotsAdded: 1,
    })

    const restored = await getPoem(poem.id)
    expect(restored?.collectionIds).toEqual([collection.id])
  })

  it('remaps a colliding story id to a new one and keeps its snapshots attached', async () => {
    const story = await createStory('A')
    await createSnapshot(story.id, 'A', 'v1')
    const data = await exportLibrary()

    const result = await importLibrary(data)
    expect(result.storiesAdded).toBe(1)
    expect(result.snapshotsAdded).toBe(1)

    const allStories = await db.stories.toArray()
    expect(allStories).toHaveLength(2)
    const duplicate = allStories.find((s) => s.id !== story.id)!
    expect(duplicate.title).toBe('A')

    const duplicateSnapshots = await listSnapshots(duplicate.id)
    expect(duplicateSnapshots).toHaveLength(1)

    const originalSnapshots = await listSnapshots(story.id)
    expect(originalSnapshots).toHaveLength(1)
  })

  it('falls back to an empty stories array for pre-story-mode export files', async () => {
    const poem = await createPoem('A')
    const data = await exportLibrary()
    // Simulate an older export file from before "stories" existed.
    const legacyData = { ...data, stories: undefined } as unknown as typeof data

    await db.poems.clear()
    const result = await importLibrary(legacyData)

    expect(result.storiesAdded).toBe(0)
    expect(await getPoem(poem.id)).not.toBeNull()
  })

  it('remaps a colliding poem id to a new one and keeps its snapshots attached', async () => {
    const poem = await createPoem('A')
    await createSnapshot(poem.id, 'A', 'v1')
    const data = await exportLibrary()

    // Poem still exists locally (collision) — import should duplicate it
    // under a new id rather than overwrite the original.
    const result = await importLibrary(data)
    expect(result.poemsAdded).toBe(1)
    expect(result.snapshotsAdded).toBe(1)

    const allPoems = await db.poems.toArray()
    expect(allPoems).toHaveLength(2)
    const duplicate = allPoems.find((p) => p.id !== poem.id)!
    expect(duplicate.title).toBe('A')

    const duplicateSnapshots = await listSnapshots(duplicate.id)
    expect(duplicateSnapshots).toHaveLength(1)

    // The original poem's own snapshot is untouched.
    const originalSnapshots = await listSnapshots(poem.id)
    expect(originalSnapshots).toHaveLength(1)
  })

  it("remaps a colliding collection id and updates the imported poem's reference", async () => {
    const collection = await createCollection('Sonnets')
    const poem = await createPoem('A')
    await updatePoem(poem.id, { collectionIds: [collection.id] })
    const data = await exportLibrary()

    // Both the collection and the poem already exist locally — both should
    // be duplicated under new ids, with the duplicate poem pointing at the
    // duplicate collection (not the original).
    await importLibrary(data)

    const allCollections = await db.collections.toArray()
    expect(allCollections).toHaveLength(2)
    const duplicateCollection = allCollections.find((c) => c.id !== collection.id)!

    const allPoems = await db.poems.toArray()
    const duplicatePoem = allPoems.find((p) => p.id !== poem.id)!
    expect(duplicatePoem.collectionIds).toEqual([duplicateCollection.id])
  })

  it('does not overwrite an existing word override', async () => {
    await setOverride('fire', { syllables: 1 })
    const data = await exportLibrary()

    await setOverride('fire', { syllables: 2 }) // local change since export
    const result = await importLibrary(data)

    expect(result.wordOverridesAdded).toBe(0)
    const overrides = await db.wordOverrides.toArray()
    expect(overrides.find((o) => o.word === 'fire')?.syllables).toBe(2)
  })

  it('adds a word override for a word with no existing local override', async () => {
    await setOverride('fire', { syllables: 1 })
    const data = await exportLibrary()

    await db.wordOverrides.clear()
    const result = await importLibrary(data)

    expect(result.wordOverridesAdded).toBe(1)
  })
})
