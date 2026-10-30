import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { ToolbarIcon } from '@/features/editor/story/ToolbarIcon'
import { BubbleMenu } from '@tiptap/react/menus'

interface RichToolbarProps {
  editor: Editor | null
  onAddComment: () => void
}

const HIGHLIGHTS = ['#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3']
const COLORS = ['#8c3b4b', '#3e4c8c', '#4b7b6f', '#8e642f']

/** A Google-Docs-style formatting toolbar. Reads active-mark state so buttons
 * reflect the current selection. Null-safe: renders disabled when no editor. */
export function RichToolbar({ editor, onAddComment }: RichToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            hasSelection: !editor.state.selection.empty,
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strike: editor.isActive('strike'),
            h1: editor.isActive('heading', { level: 1 }),
            h2: editor.isActive('heading', { level: 2 }),
            h3: editor.isActive('heading', { level: 3 }),
            bullet: editor.isActive('bulletList'),
            ordered: editor.isActive('orderedList'),
            quote: editor.isActive('blockquote'),
            alignLeft: editor.isActive({ textAlign: 'left' }),
            alignCenter: editor.isActive({ textAlign: 'center' }),
            alignRight: editor.isActive({ textAlign: 'right' }),
            link: editor.isActive('link'),
          }
        : null,
  })

  if (!editor) return <div className="h-11 border-b border-canvas-line" />

  const btn = (active: boolean | undefined) =>
    `inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-default shrink-0 rounded px-2.5 py-2 text-sm transition-colors sm:px-2 sm:py-1 ${
      active ? 'bg-indigo text-paper' : 'text-ink/60 hover:bg-canvas'
    }`

  const swatch = 'ml-0.5 h-6 w-6 shrink-0 border border-canvas-line sm:h-5 sm:w-5'

  function setLink() {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const href = window.prompt('Link URL')
    if (href) editor.chain().focus().setLink({ href }).run()
  }

  return (
    <>
      {/* One sideways-scrolling row on a phone — wrapping 25 controls would
       * eat three rows of a screen that has none to spare. Wraps as before
       * from sm up, where there's width for it. */}
      <div className="scroll-strip flex items-center gap-0.5 overflow-x-auto border-b border-canvas-line px-3 py-1 sm:flex-wrap sm:overflow-x-visible sm:px-8 sm:py-1.5">
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={state?.bold}
          className={btn(state?.bold)}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={state?.italic}
          className={btn(state?.italic)}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          aria-label="Underline"
          aria-pressed={state?.underline}
          className={btn(state?.underline)}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          aria-label="Strikethrough"
          aria-pressed={state?.strike}
          className={btn(state?.strike)}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-canvas-line" />
        <button
          type="button"
          aria-label="Heading 1"
          aria-pressed={state?.h1}
          className={btn(state?.h1)}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          aria-pressed={state?.h2}
          className={btn(state?.h2)}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          aria-label="Heading 3"
          aria-pressed={state?.h3}
          className={btn(state?.h3)}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-canvas-line" />
        <button
          type="button"
          aria-label="Bullet list"
          aria-pressed={state?.bullet}
          className={btn(state?.bullet)}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ToolbarIcon name="list" />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          aria-pressed={state?.ordered}
          className={btn(state?.ordered)}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </button>
        <button
          type="button"
          aria-label="Block quote"
          aria-pressed={state?.quote}
          className={btn(state?.quote)}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;
        </button>
        <button
          type="button"
          aria-label="Horizontal rule"
          className={btn(false)}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <ToolbarIcon name="rule" />
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-canvas-line" />
        <button
          type="button"
          aria-label="Align left"
          aria-pressed={state?.alignLeft}
          className={btn(state?.alignLeft)}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <ToolbarIcon name="left" />
        </button>
        <button
          type="button"
          aria-label="Align center"
          aria-pressed={state?.alignCenter}
          className={btn(state?.alignCenter)}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <ToolbarIcon name="center" />
        </button>
        <button
          type="button"
          aria-label="Align right"
          aria-pressed={state?.alignRight}
          className={btn(state?.alignRight)}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <ToolbarIcon name="right" />
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-canvas-line" />
        <button
          type="button"
          aria-label="Link"
          aria-pressed={state?.link}
          className={btn(state?.link)}
          onClick={setLink}
        >
          <ToolbarIcon name="link" />
        </button>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Text color ${c}`}
            className={`${swatch} rounded-full`}
            style={{ background: c }}
            onClick={() => editor.chain().focus().setColor(c).run()}
          />
        ))}
        {HIGHLIGHTS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Highlight ${c}`}
            className={`${swatch} rounded`}
            style={{ background: c }}
            onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
          />
        ))}
        <button
          type="button"
          aria-label="Clear color"
          className={btn(false)}
          onClick={() => editor.chain().focus().unsetColor().unsetHighlight().run()}
        >
          Clear
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-canvas-line" />
        <button
          type="button"
          aria-label="Add comment"
          disabled={!state?.hasSelection}
          className={btn(false)}
          onClick={onAddComment}
        >
          Comment
        </button>
      </div>

      <BubbleMenu
        editor={editor}
        className="flex gap-0.5 rounded-lg border border-canvas-line bg-paper p-1 shadow-lg"
      >
        <button
          type="button"
          aria-label="Bold"
          className={btn(state?.bold)}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          aria-label="Italic"
          className={btn(state?.italic)}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button type="button" aria-label="Link" className={btn(state?.link)} onClick={setLink}>
          <ToolbarIcon name="link" />
        </button>
        <button
          type="button"
          aria-label="Add comment"
          disabled={!state?.hasSelection}
          className={btn(false)}
          onClick={onAddComment}
        >
          Comment
        </button>
      </BubbleMenu>
    </>
  )
}
