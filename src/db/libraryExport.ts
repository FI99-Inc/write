import { parseLibraryExport } from '@/db/validateLibrary'
import { db } from '@/db/schema'
import type { Poem } from '@/types/poem'
import type { Story } from '@/types/story'
import type { Snapshot } from '@/types/snapshot'
import type { WordOverride } from '@/types/override'
import type { FormTemplate } from '@/types/form'
import type { Collection } from '@/types/collection'

export interface LibraryExportData {
  version: 1 | 2
  exportedAt: number
  poems: Poem[]
  stories: Story[]
  snapshots: Snapshot[]
  wordOverrides: WordOverride[]
  customForms: FormTemplate[]
  collections: Collection[]
}

function emptyExport(): Omit<LibraryExportData, 'poems' | 'stories' | 'snapshots' | 'collections'> {
  return { version: 2, exportedAt: Date.now(), wordOverrides: [], customForms: [] }
}

export async function exportLibrary(): Promise<LibraryExportData> {
  const [poems, stories, snapshots, wordOverrides, customForms, collections] = await Promise.all([
    db.poems.toArray(),
    db.stories.toArray(),
    db.snapshots.toArray(),
    db.wordOverrides.toArray(),
    db.customForms.toArray(),
    db.collections.toArray(),
  ])
  return {
    version: 2,
    exportedAt: Date.now(),
    poems,
    stories,
    snapshots,
    wordOverrides,
    customForms,
    collections,
  }
}

export async function exportPoem(poemId: string): Promise<LibraryExportData> {
  const poem = await db.poems.get(poemId)
  if (!poem) throw new Error('Poem not found')
  const snapshots = await db.snapshots.where('poemId').equals(poemId).toArray()
  const collections = await db.collections
    .where('id')
    .anyOf(poem.collectionIds ?? [])
    .toArray()
  const form = poem.formId ? await db.customForms.get(poem.formId) : undefined
  return {
    ...emptyExport(),
    poems: [poem],
    stories: [],
    snapshots,
    collections,
    customForms: form ? [form] : [],
  }
}

export async function exportStory(storyId: string): Promise<LibraryExportData> {
  const story = await db.stories.get(storyId)
  if (!story) throw new Error('Story not found')
  // Snapshots are shared with poems (see db/snapshots.ts) — its poemId
  // field is just an opaque document id, reused for story ids too.
  const snapshots = await db.snapshots.where('poemId').equals(storyId).toArray()
  const collections = await db.collections
    .where('id')
    .anyOf(story.collectionIds ?? [])
    .toArray()
  return { ...emptyExport(), poems: [], stories: [story], snapshots, collections }
}

export async function exportCollection(collectionId: string): Promise<LibraryExportData> {
  const collection = await db.collections.get(collectionId)
  if (!collection) throw new Error('Collection not found')
  const poems = await db.poems.where('collectionIds').equals(collectionId).toArray()
  const stories = await db.stories.where('collectionIds').equals(collectionId).toArray()
  const documentIds = [...poems, ...stories].map((doc) => doc.id)
  const snapshots = await db.snapshots.where('poemId').anyOf(documentIds).toArray()
  const formIds = poems.flatMap((poem) => (poem.formId ? [poem.formId] : []))
  const customForms = await db.customForms.where('id').anyOf(formIds).toArray()
  const collectionIds = [
    ...new Set([...poems, ...stories].flatMap((doc) => doc.collectionIds ?? [])),
  ]
  const collections = await db.collections
    .where('id')
    .anyOf([...collectionIds, collectionId])
    .toArray()
  return { ...emptyExport(), poems, stories, snapshots, collections, customForms }
}

export interface ImportResult {
  poemsAdded: number
  storiesAdded: number
  ideasAdded: number
  collectionsAdded: number
  customFormsAdded: number
  wordOverridesAdded: number
  snapshotsAdded: number
}

/**
 * Imports data alongside whatever's already in the library — nothing
 * existing is ever overwritten. An id that collides with an existing
 * record gets a fresh id instead (treated as a duplicate/copy), with
 * cross-references (poem/story -> collection, snapshot -> poem/story)
 * remapped to follow. Word overrides are the one exception: an existing
 * override for a word is left alone rather than silently replaced by the
 * imported one.
 */
export async function importLibrary(input: unknown): Promise<ImportResult> {
  const data = await parseLibraryExport(input)
  const poemIdRemap = new Map<string, string>()
  const storyIdRemap = new Map<string, string>()
  const collectionIdRemap = new Map<string, string>()
  const formIdRemap = new Map<string, string>()
  let poemsAdded = 0
  let storiesAdded = 0
  let ideasAdded = 0
  let collectionsAdded = 0
  let customFormsAdded = 0
  let wordOverridesAdded = 0
  let snapshotsAdded = 0

  await db.transaction(
    'rw',
    [db.poems, db.stories, db.snapshots, db.wordOverrides, db.customForms, db.collections],
    async () => {
      for (const collection of data.collections) {
        const existing = await db.collections.get(collection.id)
        if (existing) {
          const newId = crypto.randomUUID()
          collectionIdRemap.set(collection.id, newId)
          await db.collections.add({ ...collection, id: newId })
        } else {
          await db.collections.add(collection)
        }
        collectionsAdded++
      }

      for (const form of data.customForms) {
        const existing = await db.customForms.get(form.id)
        if (existing) {
          const newId = crypto.randomUUID()
          formIdRemap.set(form.id, newId)
          await db.customForms.add({ ...form, id: newId })
        } else {
          await db.customForms.add(form)
        }
        customFormsAdded++
      }

      for (const rawPoem of data.poems) {
        const poem = {
          ...rawPoem,
          draftSavedAt: Date.now(),
          formId: rawPoem.formId
            ? (formIdRemap.get(rawPoem.formId) ?? rawPoem.formId)
            : rawPoem.formId,
        }
        const remappedCollectionIds = (poem.collectionIds ?? []).map(
          (cid) => collectionIdRemap.get(cid) ?? cid,
        )
        const existing = (await db.poems.get(poem.id)) ?? (await db.stories.get(poem.id))
        if (existing) {
          const newId = crypto.randomUUID()
          poemIdRemap.set(poem.id, newId)
          await db.poems.add({ ...poem, id: newId, collectionIds: remappedCollectionIds })
        } else {
          await db.poems.add({ ...poem, collectionIds: remappedCollectionIds })
        }
        poemsAdded++
      }

      for (const rawStory of data.stories ?? []) {
        const story = { ...rawStory, draftSavedAt: Date.now() }
        const remappedCollectionIds = (story.collectionIds ?? []).map(
          (cid) => collectionIdRemap.get(cid) ?? cid,
        )
        const existing = (await db.stories.get(story.id)) ?? (await db.poems.get(story.id))
        if (existing) {
          const newId = crypto.randomUUID()
          storyIdRemap.set(story.id, newId)
          await db.stories.add({ ...story, id: newId, collectionIds: remappedCollectionIds })
        } else {
          await db.stories.add({ ...story, collectionIds: remappedCollectionIds })
        }
        if (story.kind === 'idea') ideasAdded++
        else storiesAdded++
      }

      for (const snapshot of data.snapshots) {
        const documentId =
          poemIdRemap.get(snapshot.poemId) ?? storyIdRemap.get(snapshot.poemId) ?? snapshot.poemId
        await db.snapshots.add({ ...snapshot, id: crypto.randomUUID(), poemId: documentId })
        snapshotsAdded++
      }

      for (const override of data.wordOverrides) {
        const existing = await db.wordOverrides.get(override.word)
        if (!existing) {
          await db.wordOverrides.add(override)
          wordOverridesAdded++
        }
      }
    },
  )

  return {
    poemsAdded,
    storiesAdded,
    ideasAdded,
    collectionsAdded,
    customFormsAdded,
    wordOverridesAdded,
    snapshotsAdded,
  }
}
