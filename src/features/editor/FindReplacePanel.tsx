import { useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import {
  findTextMatches,
  replaceTextMatches,
  lineRange,
  MAX_SEARCH_MATCHES,
  type TextMatch,
} from '@/engines/findReplace'
import { findRichMatches, searchKey, searchPlugin } from '@/engines/richText/search'
import { plainWritingLine } from '@/engines/plainWriting'
import { revealTextareaSelection } from '@/features/editor/textareaSelection'
import { useRegisterCommands } from '@/engines/useCommandPalette'

interface Props {
  body: string
  onChange: (text: string) => void
  editor?: Editor | null
  plain?: boolean
  getTextarea: () => HTMLTextAreaElement | null
}
export function FindReplacePanel({ body, onChange, editor, plain = false, getTextarea }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [cursor, setCursor] = useState({ key: '', index: -1 })
  const [line, setLine] = useState('1')
  const [undo, setUndo] = useState<{ before: string; after: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const key = JSON.stringify([query, caseSensitive, wholeWord])
  const richDoc = editor?.state.doc
  const matches = useMemo(
    () =>
      !open
        ? []
        : richDoc
          ? findRichMatches(richDoc, query, { caseSensitive, wholeWord })
          : findTextMatches(body, query, { caseSensitive, wholeWord }),
    [body, richDoc, query, caseSensitive, wholeWord, open],
  )
  const index = cursor.key === key ? Math.min(cursor.index, matches.length - 1) : -1
  const headings = useMemo(() => {
    const entries: { position: number; text: string }[] = []
    if (open && richDoc)
      richDoc.descendants((node, position) => {
        if (node.type.name === 'heading')
          entries.push({ position: position + 1, text: node.textContent })
      })
    return entries
  }, [open, richDoc])
  function reveal(match: TextMatch) {
    if (editor) editor.chain().focus().setTextSelection(match).scrollIntoView().run()
    else {
      const textarea = getTextarea()
      if (textarea) revealTextareaSelection(textarea, match)
    }
  }

  function next(delta = 1) {
    if (!matches.length) return
    const selected =
      index < 0
        ? delta < 0
          ? matches.length - 1
          : 0
        : (index + delta + matches.length) % matches.length
    setCursor({ key, index: selected })
    reveal(matches[selected])
  }
  useRegisterCommands('find-replace', [
    {
      id: 'find-writing',
      label: 'Find and replace in this document',
      shortcut: 'Ctrl+F',
      run: () => setOpen(true),
    },
  ])
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && ['f', 'h'].includes(event.key.toLowerCase())) {
        event.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => input.current?.focus())
      } else if (event.key === 'Escape' && open) {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => document.removeEventListener('keydown', keyboard)
  }, [open])
  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])
  useEffect(() => {
    if (!editor || !open) return
    editor.registerPlugin(searchPlugin(query, { caseSensitive, wholeWord }))
    return () => {
      editor.unregisterPlugin(searchKey)
    }
  }, [editor, open, query, caseSensitive, wholeWord])
  function apply(selected: TextMatch[]) {
    if (!selected.length) return
    if (editor) {
      const transaction = closeHistory(editor.state.tr)
      for (const match of [...selected].reverse())
        transaction.insertText(replacement, match.from, match.to)
      editor.view.dispatch(transaction.scrollIntoView())
      editor.view.dispatch(closeHistory(editor.state.tr))
      editor.commands.focus()
    } else {
      const after = replaceTextMatches(body, selected, replacement)
      const textarea = getTextarea()
      if (textarea) {
        textarea.focus()
        textarea.select()
        if (typeof document.execCommand === 'function')
          document.execCommand('insertText', false, after)
      }
      onChange(after)
      setUndo({ before: body, after })
    }
    setCursor({ key, index: -1 })
  }
  return (
    <section
      aria-label="Document navigation"
      className="shrink-0 border-b border-canvas-line bg-paper/60 px-4 py-2 sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <button
          ref={trigger}
          type="button"
          className="quiet-button"
          aria-expanded={open}
          aria-controls="find-writing"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close find' : 'Find / replace'}
        </button>
        {!open && <span className="hidden text-ink/40 sm:inline">Ctrl / ⌘ F</span>}
      </div>
      {open && (
        <div id="find-writing" className="mt-2 space-y-3 pb-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="field-label min-w-36 flex-1">
              Find
              <input
                ref={input}
                className="field-input mt-1"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    next(event.shiftKey ? -1 : 1)
                  }
                }}
              />
            </label>
            <button
              className="action-secondary"
              disabled={!matches.length}
              onClick={() => next(-1)}
            >
              Previous match
            </button>
            <button className="action-secondary" disabled={!matches.length} onClick={() => next()}>
              Next match
            </button>
            <span role="status" className="py-2 text-xs text-ink/60">
              {matches.length >= MAX_SEARCH_MATCHES
                ? `${MAX_SEARCH_MATCHES}+ matches; narrow your search`
                : query
                  ? `${index + 1} of ${matches.length} matches`
                  : 'Enter text to find'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(event) => setCase(event.target.checked)}
              />
              Match case
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(event) => setWholeWord(event.target.checked)}
              />
              Whole words
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="field-label min-w-36 flex-1">
              Replace with
              <input
                className="field-input mt-1"
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
              />
            </label>
            <button
              className="action-secondary"
              disabled={!matches.length}
              onClick={() => apply([matches[Math.max(0, index)]])}
            >
              Replace match
            </button>
            <button
              className="action-secondary"
              disabled={!matches.length || matches.length >= MAX_SEARCH_MATCHES}
              onClick={() => apply(matches)}
            >
              Replace all
            </button>
            {!editor && undo && body === undo.after && (
              <button
                className="quiet-button text-xs"
                onClick={() => {
                  onChange(undo.before)
                  setUndo(null)
                }}
              >
                Undo replacement
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {editor && !plain ? (
              <label className="field-label min-w-0 flex-1">
                Jump to heading
                <select
                  className="field-input mt-1"
                  defaultValue=""
                  onChange={(event) => {
                    const position = Number(event.target.value)
                    reveal({ from: position, to: position })
                    event.target.value = ''
                  }}
                >
                  <option value="">Choose a heading</option>
                  {headings.map((heading) => (
                    <option value={heading.position} key={heading.position}>
                      {heading.text || 'Untitled heading'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  reveal(
                    editor && plain
                      ? plainWritingLine(editor.state.doc, Math.max(1, Number(line) || 1))
                      : lineRange(body, Math.max(1, Number(line) || 1)),
                  )
                }}
              >
                <label className="field-label">
                  Jump to line
                  <input
                    type="number"
                    min="1"
                    className="field-input mt-1 w-24"
                    value={line}
                    onChange={(event) => setLine(event.target.value)}
                  />
                </label>
                <button className="action-secondary">Go to line</button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
