import type { JSONContent } from '@tiptap/core'
import type { StoryComment } from '@/types/story'

export interface Snapshot {
  id: string
  poemId: string
  title: string
  body: string
  /** Rich-story document JSON captured with this snapshot, when present. */
  content?: JSONContent
  comments?: StoryComment[]
  createdAt: number
  label?: string
}
