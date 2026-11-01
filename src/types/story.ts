import type { JSONContent } from '@tiptap/core'
import type { PoemStatus } from '@/types/poem'

export type StoryFormat = 'plain' | 'rich'

/** A comment thread anchored to a range in a rich story. The anchor itself
 * lives in the document as a `comment` mark carrying this `id`; this record
 * holds the human-facing thread data. Single-user app, so no author field. */
export interface StoryComment {
  id: string
  text: string
  resolved: boolean
  createdAt: number
}

/** A long-form prose document — the "short story mode" counterpart to Poem.
 * Deliberately has none of the poem-specific analysis fields (rhyme/scansion
 * overrides, target meter, form template) since none of them apply to prose;
 * shares the same status/tags/favorite/collection shape as Poem so the
 * library can list both side by side. */
export interface Story {
  id: string
  /** The original Idea remains available with its comments and versions. */
  sourceIdeaId?: string
  title: string
  /** Plain prose text — wrapped and paginated by the browser, not rendered
   * line-by-line the way a poem's body is. */
  body: string
  createdAt: number
  modifiedAt: number
  /** Scheduling revision of the last saved text, separate from metadata edits. */
  draftSavedAt?: number
  deletedAt?: number
  /** Legacy prose records without a kind are stories. */
  kind?: 'story' | 'idea'
  tags?: string[]
  status?: PoemStatus
  favorite?: boolean
  collectionIds?: string[]
  /** Absent means 'plain' (every pre-rich-editor story). Set once at
   * creation and never changed, so stories never silently lose formatting. */
  format?: StoryFormat
  /** ProseMirror document JSON — rich stories only. `body` is always kept in
   * sync as this doc's plain-text projection. */
  content?: JSONContent
  /** Comment threads for a rich story; anchors live in `content`. */
  comments?: StoryComment[]
}

export function storyFormat(story: Pick<Story, 'format'>): StoryFormat {
  return story.format ?? 'plain'
}
