import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { getWordAtPosition } from '@/engines/normalize'
import type { StorySurfaceHandle } from '@/features/editor/story/storySurface'

/** Nearest scrolling ancestor, so the autosize height reset below can
 * preserve its scroll position (see the useLayoutEffect note). */
function getScrollParent(node: HTMLElement): HTMLElement | null {
  let el = node.parentElement
  while (el) {
    const overflowY = getComputedStyle(el).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight)
      return el
    el = el.parentElement
  }
  return null
}

interface PlainStoryEditorProps {
  body: string
  onBodyChange: (body: string) => void
  onActiveWordChange: (word: string | null) => void
  fontFamily: string
  fontSize: number
  lineHeight: number
}

/** The original short-story surface: a single autosizing textarea whose page
 * scrolls as one document. Extracted from StoryEditorPage so it can sit behind
 * the same StorySurfaceHandle as the rich editor. */
export const PlainStoryEditor = forwardRef<StorySurfaceHandle, PlainStoryEditorProps>(
  function PlainStoryEditor(
    { body, onBodyChange, onActiveWordChange, fontFamily, fontSize, lineHeight },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
      getActiveWord() {
        const ta = textareaRef.current
        if (!ta) return null
        return getWordAtPosition(body, ta.selectionStart)?.word ?? null
      },
      insertText(text: string) {
        const ta = textareaRef.current
        if (!ta) return
        const start = ta.selectionStart
        const end = ta.selectionEnd
        onBodyChange(body.slice(0, start) + text + body.slice(end))
        requestAnimationFrame(() => {
          ta.focus()
          const pos = start + text.length
          ta.setSelectionRange(pos, pos)
        })
      },
      getPlainText() {
        return body
      },
    }))

    // Autosize to content. Resetting height to 'auto' collapses the textarea
    // to its min-height, shrinking the scroll container so the browser clamps
    // its scrollTop toward 0 — which visibly jumps the page up when editing
    // mid-document. Capture the scroller's position and restore it after
    // regrowing, in useLayoutEffect so the whole thing happens before paint.
    useLayoutEffect(() => {
      const ta = textareaRef.current
      if (!ta) return
      const scroller = getScrollParent(ta)
      const prevScrollTop = scroller ? scroller.scrollTop : window.scrollY
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
      if (scroller) scroller.scrollTop = prevScrollTop
      else window.scrollTo(0, prevScrollTop)
    }, [body, fontSize, lineHeight])

    function handleSelection() {
      const ta = textareaRef.current
      if (!ta) return
      onActiveWordChange(getWordAtPosition(body, ta.selectionStart)?.word ?? null)
    }

    return (
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        onSelect={handleSelection}
        onClick={handleSelection}
        onKeyUp={handleSelection}
        placeholder="Start writing…"
        aria-label="Writing text"
        spellCheck
        className="mt-6 w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-ink/30"
        style={{
          fontSize,
          lineHeight: `${lineHeight}px`,
          fontFamily,
          color: 'var(--color-ink)',
          caretColor: 'var(--color-ink)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: '60vh',
        }}
      />
    )
  },
)
