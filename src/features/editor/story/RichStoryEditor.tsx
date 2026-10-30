import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor, JSONContent } from '@tiptap/core'
import { storyExtensions } from '@/engines/richText/extensions'
import { parseClipboardText, normalizeClipboardHtml } from '@/engines/richText/clipboard'
import { nodeToPlainText } from '@/engines/richText/projection'
import { normalizeWord } from '@/engines/normalize'
import type { StorySurfaceHandle } from '@/features/editor/story/storySurface'

export interface RichStoryHandle extends StorySurfaceHandle {
  editor: Editor | null
}

interface RichStoryEditorProps {
  content: JSONContent
  onChange: (content: JSONContent, text: string) => void
  onActiveWordChange: (word: string | null) => void
  /** Notified with the live editor instance once TipTap finishes creating it
   * (and with `null` just before it's destroyed), so a parent can drive an
   * external toolbar off React state instead of reading a ref during render
   * — `useEditor({ immediatelyRender: false })` creates the editor
   * asynchronously, so a ref read on first render would miss it. Optional
   * since most consumers (tests, read-only previews) don't need it. */
  onEditor?: (editor: Editor | null) => void
  fontFamily: string
  fontSize: number
  lineHeight: number
}

/** Reads the word surrounding the current selection head from the live
 * document, mirroring getWordAtPosition for the plain surface. */
function activeWordFromEditor(editor: Editor | null): string | null {
  if (!editor) return null
  const { state } = editor
  const { from } = state.selection
  const rangeStart = Math.max(0, from - 60)
  const rangeEnd = Math.min(state.doc.content.size, from + 60)
  const parentText = state.doc.textBetween(rangeStart, rangeEnd, '\n', ' ')
  // Find the token in parentText that straddles the caret's local offset.
  // The local offset can't be derived by simply subtracting rangeStart from
  // `from`: ProseMirror doc positions count node-boundary tokens (list/
  // blockquote/paragraph open+close) that textBetween's block-separator
  // output doesn't, so once the caret sits after any such nodes the two
  // scales diverge. Re-running textBetween up to `from` gives the exact
  // projected-text length of that prefix, since it's the same deterministic
  // walk truncated earlier.
  const localCaret = state.doc.textBetween(rangeStart, from, '\n', ' ').length
  const before = parentText.slice(0, localCaret).match(/[\p{L}'‘’ʼ–—-]+$/u)?.[0] ?? ''
  const after = parentText.slice(localCaret).match(/^[\p{L}'‘’ʼ–—-]+/u)?.[0] ?? ''
  const raw = before + after
  const word = normalizeWord(raw)
  return word.length > 0 ? word : null
}

export const RichStoryEditor = forwardRef<RichStoryHandle, RichStoryEditorProps>(
  function RichStoryEditor(
    { content, onChange, onActiveWordChange, onEditor, fontFamily, fontSize, lineHeight },
    ref,
  ) {
    const editor = useEditor({
      extensions: storyExtensions,
      content,
      immediatelyRender: false,
      editorProps: {
        attributes: { 'aria-label': 'Writing text' },
        clipboardTextParser: parseClipboardText,
        transformPastedHTML: normalizeClipboardHtml,
      },
      onUpdate: ({ editor }) => onChange(editor.getJSON(), nodeToPlainText(editor.state.doc)),
      onSelectionUpdate: ({ editor }) => onActiveWordChange(activeWordFromEditor(editor)),
    })

    useEffect(() => {
      onEditor?.(editor)
      return () => onEditor?.(null)
      // Keyed on `editor` alone: `onEditor` is expected to be a stable
      // callback (a useState setter in practice), and re-running this
      // whenever its reference changes would flicker the reported editor to
      // null and back for no reason.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor])

    useImperativeHandle(
      ref,
      () => ({
        editor,
        getActiveWord: () => activeWordFromEditor(editor),
        insertText: (text: string) =>
          editor?.chain().focus().insertContent({ type: 'text', text }).run(),
        getPlainText: () => (editor ? nodeToPlainText(editor.state.doc) : ''),
      }),
      [editor],
    )

    return (
      <EditorContent
        editor={editor}
        className="mt-6 w-full"
        style={{ fontSize, lineHeight: `${lineHeight}px`, fontFamily, color: 'var(--color-ink)' }}
      />
    )
  },
)
