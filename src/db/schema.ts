import Dexie, { type EntityTable } from 'dexie'
import type { Poem } from '@/types/poem'
import type { Story } from '@/types/story'
import type { WordOverride } from '@/types/override'
import type { Snapshot } from '@/types/snapshot'
import type { FormTemplate } from '@/types/form'
import type { Collection } from '@/types/collection'
import type { Project } from '@/types/project'

export class Sonnet5DB extends Dexie {
  poems!: EntityTable<Poem, 'id'>
  stories!: EntityTable<Story, 'id'>
  wordOverrides!: EntityTable<WordOverride, 'word'>
  snapshots!: EntityTable<Snapshot, 'id'>
  customForms!: EntityTable<FormTemplate, 'id'>
  collections!: EntityTable<Collection, 'id'>

  projects!: EntityTable<Project, 'id'>
  backupPreferences!: EntityTable<{ id: string; value: unknown }, 'id'>

  constructor(name = 'sonnet5') {
    super(name)
    this.version(1).stores({
      poems: 'id, title, createdAt, modifiedAt',
    })
    this.version(2).stores({
      poems: 'id, title, createdAt, modifiedAt',
      wordOverrides: 'word',
    })
    this.version(3).stores({
      poems: 'id, title, createdAt, modifiedAt',
      wordOverrides: 'word',
      snapshots: 'id, poemId, createdAt',
    })
    this.version(4).stores({
      poems: 'id, title, createdAt, modifiedAt',
      wordOverrides: 'word',
      snapshots: 'id, poemId, createdAt',
      customForms: 'id, name',
    })
    this.version(5).stores({
      poems: 'id, title, createdAt, modifiedAt, status, favorite, *tags, *collectionIds',
      wordOverrides: 'word',
      snapshots: 'id, poemId, createdAt',
      customForms: 'id, name',
      collections: 'id, name, createdAt',
    })
    // Short story mode: a separate table (rather than cramming poem-only
    // fields like rhymeOverrides/formId onto prose documents) — snapshots
    // are shared as-is, since its poemId field is just an opaque document id.
    this.version(6).stores({
      poems: 'id, title, createdAt, modifiedAt, status, favorite, *tags, *collectionIds',
      stories: 'id, title, createdAt, modifiedAt, status, favorite, *tags, *collectionIds',
      wordOverrides: 'word',
      snapshots: 'id, poemId, createdAt',
      customForms: 'id, name',
      collections: 'id, name, createdAt',
    })
    // Rich short-story mode: adds format/content/comments to stories and
    // content to snapshots. All new fields are unindexed object properties,
    // so no data migration is required — legacy rows simply lack them and are
    // treated as plain text at read time (see storyFormat()).
    this.version(7).stores({
      poems: 'id, title, createdAt, modifiedAt, status, favorite, *tags, *collectionIds',
      stories: 'id, title, createdAt, modifiedAt, status, favorite, *tags, *collectionIds',
      wordOverrides: 'word',
      snapshots: 'id, poemId, createdAt',
      customForms: 'id, name',
      collections: 'id, name, createdAt',
    })
    // Existing rows remain active; absent prose kind continues to mean story.
    this.version(8).stores({
      poems: 'id, title, createdAt, modifiedAt, deletedAt, status, favorite, *tags, *collectionIds',
      stories:
        'id, title, createdAt, modifiedAt, deletedAt, kind, status, favorite, *tags, *collectionIds',
    })
    this.version(9).stores({ projects: 'id, name, modifiedAt', backupPreferences: 'id' })
  }
}

export const db = new Sonnet5DB()
