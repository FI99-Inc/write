export interface Poem {
  id: string
  title: string
  /** Raw text: newline-separated lines, a blank line starts a new stanza. */
  body: string
  createdAt: number
  modifiedAt: number
  /** Scheduling revision of the last saved text, separate from metadata edits. */
  draftSavedAt?: number
  /** Present only while this document is in recoverable Trash. */
  deletedAt?: number
  /** User-pinned rhyme-scheme labels, keyed by line index — overrides the
   * automatically detected label for that line only. */
  rhymeOverrides?: Record<number, string>
  /** Manual per-syllable stress corrections, keyed by "lineIndex-syllableIndex"
   * (syllableIndex is the position in that line's flat scansion array). */
  scansionOverrides?: Record<string, 0 | 1>
  /** The meter target-meter mode is checking lines against, if the poet has
   * picked one. */
  targetMeter?: { foot: 'iamb' | 'trochee' | 'anapest' | 'dactyl'; feet: number } | null
  /** Built-in or custom form template id this poem is being checked against. */
  formId?: string | null
  /** The word an acrostic poem's first letters spell — only meaningful when
   * formId is "acrostic". */
  acrosticWord?: string
  /** Free-form labels, lowercase. */
  tags?: string[]
  status?: PoemStatus
  favorite?: boolean
  /** Collections this poem belongs to (a poem can be in more than one). */
  collectionIds?: string[]
}

export type PoemStatus = 'idea' | 'draft' | 'revising' | 'done'

export const POEM_STATUSES: PoemStatus[] = ['idea', 'draft', 'revising', 'done']
