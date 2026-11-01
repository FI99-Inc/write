import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import {
  plainWritingDoc,
  plainWritingText,
  plainWritingSlice,
  plainWritingExtensions,
  pastePlainWriting,
  plainClipboardText,
  copyPlainWriting,
} from '@/engines/plainWriting'
import { getWordAtPosition } from '@/engines/normalize'
import type { StorySurfaceHandle } from '@/features/editor/story/storySurface'
interface PlainStoryEditorProps {
  body: string
  onBodyChange: (body: string) => void
  onActiveWordChange: (word: string | null) => void
  onEditor?: (editor: Editor | null) => void
  fontFamily: string
  fontSize: number
  lineHeight: number
}
function activeWord(editor: Editor | null): string | null {
  if (!editor) return null
  const { $from } = editor.state.selection
  return getWordAtPosition($from.parent.textContent, $from.parentOffset)?.word ?? null
}

/** Incremental paragraphs avoid native large-textarea input cost while retaining a plain-text storage contract. */
export const PlainStoryEditor = forwardRef<StorySurfaceHandle, PlainStoryEditorProps>(
  function PlainStoryEditor(
    { body, onBodyChange, onActiveWordChange, onEditor, fontFamily, fontSize, lineHeight },
    ref,
  ) {
    const [initialContent] = useState(() => plainWritingDoc(body))
    const editor = useEditor({
      extensions: plainWritingExtensions,
      content: initialContent,
      coreExtensionOptions: { clipboardTextSerializer: { blockSeparator: '\n' } },
      immediatelyRender: false,
      editorProps: {
        handleDOMEvents: {
          copy: (view, event) => copyPlainWriting(view, event),
          cut: (view, event) => copyPlainWriting(view, event, true),
        },
        attributes: {
          role: 'textbox',
          'aria-label': 'Writing text',
          'aria-multiline': 'true',
          spellcheck: 'true',
        },
        handlePaste(view, event) {
          if (!event.clipboardData) return false
          const text = plainClipboardText(event.clipboardData)
          event.preventDefault()
          pastePlainWriting(view, text)
          return true
        },
      },
      onUpdate: ({ editor }) => onBodyChange(plainWritingText(editor.state.doc)),
      onSelectionUpdate: ({ editor }) => onActiveWordChange(activeWord(editor)),
    })
    useEffect(() => {
      onEditor?.(editor)
      return () => onEditor?.(null)
    }, [editor, onEditor])
    useImperativeHandle(
      ref,
      () => ({
        getActiveWord: () => activeWord(editor),
        getPlainText: () => (editor ? plainWritingText(editor.state.doc) : body),
        insertText(text: string) {
          if (!editor) return
          const transaction = editor.state.tr.replaceSelection(
            plainWritingSlice(text, editor.state.schema),
          )
          editor.view.dispatch(transaction.scrollIntoView())
          editor.commands.focus()
        },
      }),
      [editor, body],
    )
    return (
      <EditorContent
        editor={editor}
        className="plain-writing-surface mt-6 w-full"
        style={{ fontFamily, fontSize, lineHeight: `${lineHeight}px`, color: 'var(--color-ink)' }}
      />
    )
  },
)
