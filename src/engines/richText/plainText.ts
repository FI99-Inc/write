import type { JSONContent } from '@tiptap/core'

/** Preserve every newline while distinguishing paragraphs from single hard breaks. */
export function plainTextToDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: text
      .replace(/\r\n?/g, '\n')
      .split('\n\n')
      .map((paragraph) => ({
        type: 'paragraph',
        content: paragraph
          .split('\n')
          .flatMap((line, index) => [
            ...(index ? [{ type: 'hardBreak' }] : []),
            ...(line ? [{ type: 'text', text: line }] : []),
          ]),
      })),
  }
}
