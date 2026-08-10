import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Editor, JSONContent } from '@tiptap/core'
import { getStory, updateStory } from '@/db/stories'
import { createSnapshot } from '@/db/snapshots'
import { useSettings } from '@/engines/SettingsContext'
import { countWords } from '@/engines/lineStats'
import { estimateReadingMinutes, countParagraphs } from '@/engines/storyStats'
import { StoryWorkbenchSidebar } from '@/features/editor/workbench/StoryWorkbenchSidebar'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { ExportMenu } from '@/features/editor/ExportMenu'
import { PrintableStory } from '@/features/editor/story/PrintableStory'
import { useRegisterCommands, type Command } from '@/engines/CommandPaletteContext'
import { PlainStoryEditor } from '@/features/editor/story/PlainStoryEditor'
import type { StorySurfaceHandle } from '@/features/editor/story/storySurface'
import { RichStoryEditor, type RichStoryHandle } from '@/features/editor/story/RichStoryEditor'
import { RichToolbar } from '@/features/editor/story/RichToolbar'
import { storyFormat, type StoryComment } from '@/types/story'
import { docToPlainText, EMPTY_DOC } from '@/engines/richText/projection'
import { toolbarPill } from '@/features/editor/editorLayout'
import { isDesktopViewport } from '@/engines/viewport'

/** The "short story mode" editor — a plain wrapping prose surface (no
 * per-line gutters/overlays, since rhyme/scansion/meter don't apply to
 * prose) meant to stay comfortable at thousands of words: the textarea
 * autosizes to its content so the page scrolls as one document, the way a
 * word processor would, rather than scrolling inside a boxed textarea. */
export function StoryEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const story = useLiveQuery(() => (id ? getStory(id) : null), [id])
  const { settings } = useSettings()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [content, setContent] = useState<JSONContent>(EMPTY_DOC)
  const [comments, setComments] = useState<StoryComment[]>([])
  const hydratedFor = useRef<string | null>(null)

  const surfaceRef = useRef<StorySurfaceHandle>(null)
  const richRef = useRef<RichStoryHandle>(null)
  // The live TipTap editor instance, reported by RichStoryEditor once it
  // exists (see its onEditor prop). Held in state rather than read off
  // richRef.current during render because useEditor({ immediatelyRender:
  // false }) creates the editor asynchronously — a ref read on first render
  // would be stale, and nothing would trigger a re-render once it resolved.
  const [richEditor, setRichEditor] = useState<Editor | null>(null)
  const format = story ? storyFormat(story) : 'plain'

  const [focusMode, setFocusMode] = useState(false)
  // On a phone the workbench is a sheet over the story, so it starts closed —
  // opening straight into it would bury the thing you came here to write.
  const [panelOpen, setPanelOpen] = useState(isDesktopViewport)
  const [snapshotSaved, setSnapshotSaved] = useState(false)
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)

  useEffect(() => {
    if (story && hydratedFor.current !== story.id) {
      setTitle(story.title)
      setBody(story.body)
      setContent(story.content ?? EMPTY_DOC)
      setComments(story.comments ?? [])
      hydratedFor.current = story.id
    }
  }, [story])

  useEffect(() => {
    if (!id || hydratedFor.current !== id) return
    const handle = setTimeout(() => {
      if (format === 'rich') {
        void updateStory(id, { title, body: docToPlainText(content), content, comments })
      } else {
        void updateStory(id, { title, body })
      }
    }, 400)
    return () => clearTimeout(handle)
  }, [id, title, body, content, comments, format])

  // The plain-text projection used everywhere the header/export/print need
  // prose stats: for rich stories that's the live doc's projection (`body`
  // state only mirrors the last debounced save, not every keystroke), for
  // plain stories it's just `body`.
  const displayBody = useMemo(
    () => (format === 'rich' ? docToPlainText(content) : body),
    [format, content, body],
  )

  const wordCount = useMemo(() => countWords(displayBody), [displayBody])
  const paragraphCount = useMemo(() => countParagraphs(displayBody), [displayBody])
  const readingMinutes = useMemo(() => estimateReadingMinutes(wordCount), [wordCount])

  async function handleSnapshot() {
    if (!id) return
    await createSnapshot(id, title, displayBody, undefined, format === 'rich' ? content : undefined)
    setSnapshotSaved(true)
    setTimeout(() => setSnapshotSaved(false), 1600)
  }

  function handleAddComment() {
    const editor = richEditor
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return // no selection: nothing to anchor to
    const comment: StoryComment = {
      id: crypto.randomUUID(),
      text: '',
      resolved: false,
      createdAt: Date.now(),
    }
    editor.chain().focus().setMark('comment', { commentId: comment.id }).run()
    setComments((prev) => [...prev, comment])
    setActiveCommentId(comment.id)
  }

  /** Strips every `comment` mark carrying `commentId` from the live doc —
   * used when a thread is deleted, so the highlighted span disappears along
   * with the thread rather than lingering as a dangling anchor. Operates on
   * the live `richEditor` state (not a ref) since that's what's guaranteed
   * to reflect the mounted editor instance; no-ops before it exists. */
  function removeCommentMark(commentId: string) {
    const editor = richEditor
    if (!editor) return
    const { state } = editor
    const tr = state.tr
    state.doc.descendants((node, pos) => {
      if (!node.isText) return
      node.marks.forEach((mark) => {
        if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
          tr.removeMark(pos, pos + node.nodeSize, mark.type)
        }
      })
    })
    if (tr.docChanged) editor.view.dispatch(tr)
  }

  /** Scrolls the anchored span for a thread into view and briefly flashes
   * it, so clicking "Jump to text" in the Comments tab is easy to follow. */
  function scrollToComment(commentId: string) {
    const el = document.querySelector<HTMLElement>(`.story-comment[data-comment-id="${commentId}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el?.classList.add('story-comment-active')
    setTimeout(() => el?.classList.remove('story-comment-active'), 1200)
  }

  const storyCommands = useMemo<Command[]>(() => {
    if (!id) return []
    return [
      {
        id: 'story-toggle-focus',
        label: focusMode ? 'Exit focus mode' : 'Enter focus mode',
        run: () => setFocusMode((v) => !v),
      },
      { id: 'story-snapshot', label: 'Save snapshot', run: () => void handleSnapshot() },
      { id: 'story-go-history', label: 'View version history', run: () => navigate(`/story/${id}/history`) },
    ]
    // handleSnapshot closes over title/body and is recreated every render
    // (not memoized) — included so a stale snapshot is never captured.
  }, [id, focusMode, navigate, handleSnapshot])

  useRegisterCommands('story-page', storyCommands)

  if (story === undefined) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas">
        <p className="text-sm text-ink/50">Loading…</p>
      </div>
    )
  }

  if (story === null) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-canvas">
        <p className="font-display text-lg text-ink">This story doesn&rsquo;t exist (anymore).</p>
        <button type="button" onClick={() => navigate('/')} className="text-indigo hover:underline">
          Back to library
        </button>
      </div>
    )
  }

  // `story` just resolved from undefined to a real record, but the
  // hydration effect above (which seeds title/body/content/comments from it)
  // hasn't committed yet — it runs after this render. Rendering
  // RichStoryEditor with last render's stale `content` state (e.g. leftover
  // EMPTY_DOC, or another story's content) would mount TipTap with the
  // wrong initial doc: useEditor only consumes `content` at creation time,
  // it doesn't reactively re-apply later prop changes, and RichStoryEditor
  // is deliberately keyed on `id` to remount rather than live-patch. So wait
  // one more tick for hydration before mounting either surface.
  //
  // Gated on the route `id`, not `story.id`: the `/story/:id` route has no
  // `key`, so navigating from one story to another (e.g. via the "New story"
  // command run from inside a story editor) reuses this component instance.
  // On that transition `story` still momentarily holds the *previous*
  // story's record (same id as `hydratedFor.current`) while `id` has already
  // changed — checking `story.id` would pass immediately and mount the
  // surface with the outgoing story's stale `content` state, and the next
  // keystroke would save it under the new id. Checking against `id` instead
  // keeps this guard true (Loading) until the hydration effect has actually
  // run for the newly-routed story.
  if (hydratedFor.current !== id) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas">
        <p className="text-sm text-ink/50">Loading…</p>
      </div>
    )
  }

  const fontFamily = settings.editorFont === 'serif' ? 'var(--font-display)' : 'var(--font-sans)'

  return (
    <>
      <div className="flex h-full flex-col bg-canvas print:hidden">
        <header className="flex items-center gap-2 border-b border-canvas-line px-3 py-2 sm:gap-5 sm:px-8 sm:py-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="shrink-0 text-sm text-ink/50 transition-colors hover:text-indigo"
          >
            <span aria-hidden="true">←</span>
            <span className="ml-1 hidden sm:inline">Library</span>
            <span className="sr-only sm:hidden">Library</span>
          </button>

          {/* Scrolls sideways on a phone so the header stays one row tall.
           * Export and Settings sit outside it — their popovers would be
           * clipped by the scroll container. */}
          <div className="scroll-strip flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-xs text-ink/40 sm:justify-end sm:gap-5 sm:overflow-x-visible">
            <span className="hidden shrink-0 sm:inline">
              {wordCount.toLocaleString()} word{wordCount === 1 ? '' : 's'}
            </span>
            <span className="hidden shrink-0 sm:inline">
              {paragraphCount} paragraph{paragraphCount === 1 ? '' : 's'}
            </span>
            <span className="hidden shrink-0 sm:inline">~{readingMinutes} min read</span>
            <span className="mx-1 hidden h-3 w-px shrink-0 bg-canvas-line sm:block" />
            <button
              type="button"
              onClick={() => setFocusMode((v) => !v)}
              aria-pressed={focusMode}
              className={toolbarPill(focusMode)}
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-pressed={panelOpen}
              className={toolbarPill(panelOpen)}
            >
              Panel
            </button>
            <button
              type="button"
              onClick={handleSnapshot}
              className="shrink-0 whitespace-nowrap py-1.5 text-ink/50 hover:text-indigo sm:py-0"
            >
              {snapshotSaved ? 'Saved ✓' : 'Snapshot'}
            </button>
            <Link
              to={`/story/${id}/history`}
              className="shrink-0 whitespace-nowrap py-1.5 text-ink/50 hover:text-indigo sm:py-0"
            >
              History
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-xs text-ink/40 sm:gap-5">
            <ExportMenu
              title={title}
              body={displayBody}
              richContent={format === 'rich' ? content : undefined}
            />
            <SettingsPanel />
          </div>
        </header>

        {format === 'rich' && <RichToolbar editor={richEditor} onAddComment={handleAddComment} />}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
            <div className={focusMode ? 'mx-auto max-w-2xl' : 'mx-auto max-w-3xl'}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Untitled"
                aria-label="Story title"
                className="w-full bg-transparent font-display text-2xl text-ink outline-none placeholder:text-ink/30 sm:text-3xl"
              />

              {/* The counts live in the header on wider screens; on a phone
               * they'd crowd out the toggles, so they read out here instead. */}
              <p className="mt-1 text-xs text-ink/40 sm:hidden">
                {wordCount.toLocaleString()} word{wordCount === 1 ? '' : 's'} · {paragraphCount} paragraph
                {paragraphCount === 1 ? '' : 's'} · ~{readingMinutes} min read
              </p>

              {format === 'rich' ? (
                <RichStoryEditor
                  key={id}
                  ref={richRef}
                  content={content}
                  onChange={setContent}
                  onActiveWordChange={setActiveWord}
                  onEditor={setRichEditor}
                  fontFamily={fontFamily}
                  fontSize={settings.fontSize}
                  lineHeight={settings.lineHeight}
                />
              ) : (
                <PlainStoryEditor
                  ref={surfaceRef}
                  body={body}
                  onBodyChange={setBody}
                  onActiveWordChange={setActiveWord}
                  fontFamily={fontFamily}
                  fontSize={settings.fontSize}
                  lineHeight={settings.lineHeight}
                />
              )}
            </div>
          </main>

          <StoryWorkbenchSidebar
            activeWord={activeWord}
            body={displayBody}
            onInsert={(word) => (format === 'rich' ? richRef.current : surfaceRef.current)?.insertText(word)}
            hidden={focusMode || !panelOpen}
            onClose={() => setPanelOpen(false)}
            commentsProps={
              format === 'rich'
                ? {
                    comments,
                    doc: content,
                    activeCommentId,
                    onEdit: (cid, text) =>
                      setComments((prev) => prev.map((c) => (c.id === cid ? { ...c, text } : c))),
                    onResolveToggle: (cid) =>
                      setComments((prev) => prev.map((c) => (c.id === cid ? { ...c, resolved: !c.resolved } : c))),
                    onDelete: (cid) => {
                      removeCommentMark(cid) // strip the mark from the doc first
                      setComments((prev) => prev.filter((c) => c.id !== cid))
                    },
                    onSelect: (cid) => {
                      setActiveCommentId(cid)
                      scrollToComment(cid)
                    },
                  }
                : undefined
            }
          />
        </div>
      </div>
      <PrintableStory
        title={title}
        format={format}
        body={displayBody}
        content={format === 'rich' ? content : undefined}
      />
    </>
  )
}
