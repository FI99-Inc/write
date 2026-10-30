import { getText, getTextSerializersFromSchema, type JSONContent } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { getStorySchema } from '@/engines/richText/extensions'
export { EMPTY_DOC } from '@/engines/richText/emptyDoc'

export function nodeToPlainText(node: Node): string {
  return getText(node, {
    blockSeparator: '\n\n',
    textSerializers: getTextSerializersFromSchema(node.type.schema),
  })
}

export function docToPlainText(doc: JSONContent): string {
  return nodeToPlainText(getStorySchema().nodeFromJSON(doc))
}

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
