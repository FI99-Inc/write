import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import {
  plainWritingDoc,
  plainWritingText,
  pastePlainWriting,
  plainClipboardText,
  plainWritingLine,
  plainWritingExtensions,
} from '@/engines/plainWriting'
describe('plain paragraph editing', () => {
  it('round-trips every literal line including leading, blank, and trailing lines', () => {
    const body = '\nFirst\nSecond\n\n\nLast\n'
    const editor = new Editor({
      extensions: plainWritingExtensions,
      editorProps: { handleScrollToSelection: () => true },
      coreExtensionOptions: { clipboardTextSerializer: { blockSeparator: '\n' } },
      content: plainWritingDoc(body),
    })
    try {
      expect(plainWritingText(editor.state.doc)).toBe(body)
      expect(editor.state.schema.marks.bold).toBeUndefined()
      expect(editor.state.schema.nodes.bulletList).toBeUndefined()
      expect(plainWritingLine(editor.state.doc, 3)).toEqual({ from: 10, to: 16 })
    } finally {
      editor.destroy()
    }
  })
  it('Enter creates one newline and a multiline paste is one undoable edit', () => {
    const editor = new Editor({
      extensions: plainWritingExtensions,
      editorProps: { handleScrollToSelection: () => true },
      coreExtensionOptions: { clipboardTextSerializer: { blockSeparator: '\n' } },
      content: plainWritingDoc('Before'),
    })
    try {
      editor.commands.setTextSelection(7)
      editor.commands.splitBlock()
      expect(plainWritingText(editor.state.doc)).toBe('Before\n')
      pastePlainWriting(editor.view, 'A\nB\n\n\nC')
      expect(plainWritingText(editor.state.doc)).toBe('Before\nA\nB\n\n\nC')
      editor.commands.undo()
      expect(plainWritingText(editor.state.doc)).toBe('Before\n')
    } finally {
      editor.destroy()
    }
  })
  it('retains HTML-only line breaks and prefers explicitly supplied plain text', () => {
    const html = '<p><strong>A</strong><br>B</p><p></p><p>C<br></p>'
    for (const fragment of ['A<br>', '<div>A<br></div>'])
      expect(
        plainClipboardText({
          types: ['text/html'],
          getData: (type) => (type === 'text/html' ? fragment : ''),
        }),
      ).toBe('A\n')
    expect(
      plainClipboardText({
        types: ['text/html'],
        getData: (type) => (type === 'text/html' ? '<p>A</p><p><br></p><p>B</p>' : ''),
      }),
    ).toBe('A\n\nB')
    expect(
      plainClipboardText({
        types: ['text/html'],
        getData: (type) => (type === 'text/html' ? html : ''),
      }),
    ).toBe('A\nB\n\nC\n')
    expect(
      plainClipboardText({
        types: ['text/plain', 'text/html'],
        getData: (type) => (type === 'text/plain' ? 'literal <b>text</b>\n' : html),
      }),
    ).toBe('literal <b>text</b>\n')
  })
  it('serializes selected plain lines without introducing paragraph gaps', () => {
    const body = '\nFirst\nSecond\n\n\nLast\n'
    const editor = new Editor({
      extensions: plainWritingExtensions,
      content: plainWritingDoc(body),
      coreExtensionOptions: { clipboardTextSerializer: { blockSeparator: '\n' } },
      editorProps: { handleScrollToSelection: () => true },
    })
    const target = new Editor({
      extensions: plainWritingExtensions,
      content: plainWritingDoc(''),
      editorProps: { handleScrollToSelection: () => true },
    })
    try {
      editor.commands.selectAll()
      const serialized = editor.view.serializeForClipboard(editor.state.selection.content())
      expect(serialized.text).toBe(body)
      pastePlainWriting(target.view, serialized.text)
      expect(plainWritingText(target.state.doc)).toBe(body)
    } finally {
      editor.destroy()
      target.destroy()
    }
  })
})
