import type { Poem, PoemStatus } from '@/types/poem'
import type { Story } from '@/types/story'

export type DocKind = 'poem' | 'story' | 'idea'

/** The shape LibraryPage renders and filters — a poem or a story tagged
 * with which one it is, so the two can be listed, searched, and filtered
 * side by side without the library needing to know about poem-only fields
 * (rhyme overrides, form template, etc.) or duplicate its UI per type. */
export interface LibraryDoc {
  kind: DocKind
  id: string
  title: string
  body: string
  createdAt: number
  modifiedAt: number
  deletedAt?: number
  tags?: string[]
  status?: PoemStatus
  favorite?: boolean
  collectionIds?: string[]
  /** Poem-only — carried through so PoemListItem-equivalent UI can still
   * show the form-template badge for poems. */
  formId?: string | null
}

export function poemToLibraryDoc(poem: Poem): LibraryDoc {
  return {
    id: poem.id,
    title: poem.title,
    body: poem.body,
    createdAt: poem.createdAt,
    modifiedAt: poem.modifiedAt,
    deletedAt: poem.deletedAt,
    tags: poem.tags,
    status: poem.status,
    favorite: poem.favorite,
    collectionIds: poem.collectionIds,
    formId: poem.formId,
    kind: 'poem',
  }
}

export function storyToLibraryDoc(story: Story): LibraryDoc {
  return {
    id: story.id,
    title: story.title,
    body: story.body,
    createdAt: story.createdAt,
    modifiedAt: story.modifiedAt,
    deletedAt: story.deletedAt,
    tags: story.tags,
    status: story.status,
    favorite: story.favorite,
    collectionIds: story.collectionIds,
    kind: story.kind ?? 'story',
  }
}

export function documentPath(doc: Pick<LibraryDoc, 'kind' | 'id'>): string {
  return `/${doc.kind}/${encodeURIComponent(doc.id)}`
}
