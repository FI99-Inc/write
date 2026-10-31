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

export { plainTextToDoc } from '@/engines/richText/plainText'
