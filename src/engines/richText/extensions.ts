import { getSchema } from '@tiptap/core'
import type { Extensions } from '@tiptap/core'
import type { Schema } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { Comment } from '@/engines/richText/Comment'

/** Single source of truth for the story rich-text document shape. Used both
 * to configure the live editor (RichStoryEditor) and to build the headless
 * schema the pure serializers (projection/serialize/comments) run against, so
 * the two can never drift.
 *
 * TipTap v3's StarterKit already bundles Link and Underline, so we configure
 * StarterKit's built-in link instead of adding a standalone Link/Underline
 * extension — adding both registers the mark twice and TipTap logs
 * "Duplicate extension names found" while building the schema. */
export const storyExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder: 'Start writing…' }),
  Comment,
]

let cachedSchema: Schema | null = null

export function getStorySchema(): Schema {
  if (!cachedSchema) cachedSchema = getSchema(storyExtensions)
  return cachedSchema
}
