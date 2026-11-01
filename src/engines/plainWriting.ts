import { Extension, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { closeHistory } from '@tiptap/pm/history'
import type { EditorView } from '@tiptap/pm/view'
import { Slice, type Node } from '@tiptap/pm/model'
import type { TextMatch } from '@/engines/findReplace'
import { normalizeClipboardHtml } from '@/engines/richText/clipboard'

/** A plain document has one paragraph per literal line, including every empty/trailing line. */
export function plainWritingDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : undefined,
      })),
  }
}
export function plainWritingText(doc: Node): string {
  const lines: string[] = []
  doc.forEach((node) => lines.push(node.textContent))
  return lines.join('\n')
}
export function plainWritingSlice(text: string, schema: Node['type']['schema']): Slice {
  return Slice.maxOpen(schema.nodeFromJSON(plainWritingDoc(text)).content)
}

/** Prefer the source's plain representation; HTML-only clipboards still retain explicit line breaks. */
export function plainClipboardText(clipboard: Pick<DataTransfer, 'getData' | 'types'>): string {
  const plainText = clipboard.getData('text/plain'),
    html = clipboard.getData('text/html')
  if (clipboard.types.includes('text/plain') || !html) return plainText
  const document = new DOMParser().parseFromString(normalizeClipboardHtml(html), 'text/html')
  const groups = new Set(['DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TABLE', 'TR'])
  const lines = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'])
  type Fragment = { text: string; endsBlock: boolean }
  function read(node: ChildNode): Fragment {
    if (node.nodeType === 3) {
      const value = node.textContent ?? ''
      const indentation =
        /\n/.test(value) &&
        !value.trim() &&
        ['BODY', 'DIV', 'UL', 'OL'].includes(node.parentElement?.tagName ?? '')
      return { text: indentation ? '' : value, endsBlock: false }
    }
    if (node.nodeName === 'BR') return { text: '\n', endsBlock: false }
    const pieces = [...node.childNodes].map(read),
      text = pieces.map((piece) => piece.text).join('')
    const endsBlock = pieces.findLast((piece) => piece.text.length > 0)?.endsBlock ?? false
    if (lines.has(node.nodeName) || (groups.has(node.nodeName) && !endsBlock))
      return { text: /^\n+$/.test(text) ? text : text + '\n', endsBlock: true }
    return { text, endsBlock }
  }
  const pieces = [...document.body.childNodes].map(read),
    text = pieces.map((piece) => piece.text).join('')
  return pieces.findLast((piece) => piece.text.length > 0)?.endsBlock ? text.slice(0, -1) : text
}

/** Plain mode supplies literal clipboard text, so rich HTML cannot reinterpret its line paragraphs. */
export function copyPlainWriting(view: EditorView, event: ClipboardEvent, cut = false): boolean {
  if (!event.clipboardData || view.state.selection.empty) return false
  const { text } = view.serializeForClipboard(view.state.selection.content())
  event.clipboardData.clearData()
  event.clipboardData.setData('text/plain', text)
  event.preventDefault()
  if (cut) {
    view.dispatch(
      closeHistory(view.state.tr).deleteSelection().setMeta('uiEvent', 'cut').scrollIntoView(),
    )
    view.dispatch(closeHistory(view.state.tr))
  }
  return true
}
export function pastePlainWriting(view: EditorView, text: string): void {
  view.dispatch(
    closeHistory(view.state.tr)
      .replaceSelection(plainWritingSlice(text, view.state.schema))
      .setMeta('paste', true)
      .setMeta('uiEvent', 'paste')
      .scrollIntoView(),
  )
  view.dispatch(closeHistory(view.state.tr))
}
export function plainWritingLine(doc: Node, line: number): TextMatch {
  const wanted = Math.min(doc.childCount - 1, Math.max(0, Math.floor(line) - 1))
  let result = { from: 1, to: 1 }
  doc.forEach((node, offset, index) => {
    if (index === wanted) result = { from: offset + 1, to: offset + 1 + node.content.size }
  })
  return result
}
export const plainWritingExtensions = [
  Placeholder.configure({ placeholder: 'Start writing…' }),
  StarterKit.configure({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    link: false,
    heading: false,
    code: false,
    codeBlock: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    horizontalRule: false,
    hardBreak: false,
  }),
  Extension.create({
    name: 'plainLineBreaks',
    addKeyboardShortcuts() {
      return { 'Shift-Enter': () => this.editor.commands.splitBlock() }
    },
  }),
]
