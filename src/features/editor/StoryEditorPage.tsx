import { useCallback, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Editor, JSONContent } from '@tiptap/core'
import { getStory, updateStory } from '@/db/stories'
import type { Story } from '@/types/story'
import { usePrinting } from '@/engines/usePrinting'
import { useDocumentSave } from '@/engines/useDocumentSave'
import { readRecovery } from '@/engines/documentWriter'
import { FindReplacePanel } from '@/features/editor/FindReplacePanel'
import { DevelopIdeaButton } from '@/features/editor/WorkspaceContext'
import { SaveStatus } from '@/features/editor/SaveStatus'
import { CheckpointButton } from '@/features/editor/CheckpointButton'
import { createSnapshot } from '@/db/snapshots'
import { useSettings } from '@/engines/useSettings'
import { countWords } from '@/engines/lineStats'
import { estimateReadingMinutes, countParagraphs } from '@/engines/storyStats'
import { StoryWorkbenchSidebar } from '@/features/editor/workbench/StoryWorkbenchSidebar'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { ExportMenu } from '@/features/editor/ExportMenu'
import { PrintableStory } from '@/features/editor/story/PrintableStory'
import { useRegisterCommands, type Command } from '@/engines/useCommandPalette'
import { PlainStoryEditor } from '@/features/editor/story/PlainStoryEditor'
import type { StorySurfaceHandle } from '@/features/editor/story/storySurface'
import {
  RichStoryEditor,
  type RichStoryHandle,
} from '@/features/editor/story/RichStoryEditor'
import { RichToolbar } from '@/features/editor/story/RichToolbar'
import { storyFormat, type StoryComment } from '@/types/story'
import { reconcileCommentAnchors } from '@/engines/richText/reconcileComments'
import { EMPTY_DOC } from '@/engines/richText/projection'
import { toolbarPill } from '@/features/editor/editorLayout'
import { DocumentTitle } from '@/features/workspace/DocumentTitle'
import {
  WritingWorkspace,
  DocumentLabel,
} from '@/features/workspace/WritingWorkspace'

/** The "short story mode" editor — a plain wrapping prose surface (no
 * per-line gutters/overlays, since rhyme/scansion/meter don't apply to
 * prose) meant to stay comfortable at thousands of words: the textarea
 * autosizes to its content so the page scrolls as one document, the way a
 * word processor would, rather than scrolling inside a boxed textarea. */
export function StoryEditorPage() {
  const { id } = useParams<{ id: string }>()
  const story = useLiveQuery(() => (id ? getStory(id) : null), [id])
  if (story === undefined)
    return (
      <p role="status" className="p-8 text-sm text-ink/60">
        Loading…
      </p>
    )
  if (!story)
    return (
      <main className="space-y-4 p-8">
        <p>This writing is unavailable. It may be in Trash.</p>
        <Link to="/" className="text-indigo underline">
          Open library
        </Link>
        <Link to="/trash" className="ml-4 text-indigo underline">
          Open Trash
        </Link>
      </main>
    )
  return <StoryWriting key={story.id} story={story} />
}

function StoryWriting({ story }: { story: Story }) {
  const id = story.id
  const navigate = useNavigate()
  const printing = usePrinting()
  const { settings } = useSettings()

  const [recovery] = useState(() =>
    readRecovery<{
      title: string
      body: string
      content?: JSONContent
      comments?: StoryComment[]
    }>(story.id, story.draftSavedAt ?? story.modifiedAt),
  )
  const [title, setTitle] = useState(recovery?.title ?? story.title)
  const [body, setBody] = useState(recovery?.body ?? story.body)
  const [content, setContent] = useState<JSONContent>(() =>
    reconcileCommentAnchors(
      recovery?.content ?? story.content ?? EMPTY_DOC,
      recovery?.comments ?? story.comments ?? [],
    ),
  )
  const [comments, setComments] = useState<StoryComment[]>(
    recovery?.comments ?? story.comments ?? [],
  )

  const surfaceRef = useRef<StorySurfaceHandle>(null)
  const richRef = useRef<RichStoryHandle>(null)
  // The live TipTap editor instance, reported by RichStoryEditor once it
  // exists (see its onEditor prop). Held in state rather than read off
  // richRef.current during render because useEditor({ immediatelyRender:
  // false }) creates the editor asynchronously — a ref read on first render
  // would be stale, and nothing would trigger a re-render once it resolved.
  const [richEditor, setRichEditor] = useState<Editor | null>(null)
  const format = storyFormat(story)

  const [focusMode, setFocusMode] = useState(false)
  const [toolsRequest, requestTools] = useState(0)
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const [commentFocusRequest, setCommentFocusRequest] = useState(0)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)

  const draft = useMemo(
    () =>
      format === 'rich' ? { title, body, content, comments } : { title, body },
    [title, body, content, comments, format],
  )
  const saving = useDocumentSave(id, draft, updateStory, {
    recovered: Boolean(recovery),
    draftSavedAt: story.draftSavedAt ?? story.modifiedAt,
  })

  const displayBody = body

  const wordCount = useMemo(() => countWords(displayBody), [displayBody])
  const paragraphCount = useMemo(
    () => countParagraphs(displayBody),
    [displayBody],
  )
  const readingMinutes = useMemo(
    () => estimateReadingMinutes(wordCount),
    [wordCount],
  )

  const handleSnapshot = useCallback(
    async (label?: string) => {
      if (!id) return
      await createSnapshot(
        id,
        title,
        displayBody,
        label,
        format === 'rich' ? content : undefined,
        format === 'rich' ? comments : undefined,
      )
    },
    [id, title, displayBody, format, content, comments],
  )

  function handleAddComment() {
    const editor = richEditor
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return // no selection: nothing to anchor to
    setCommentFocusRequest((value) => value + 1)
    const overlaps = new Set<string>()
    editor.state.doc.nodesBetween(from, to, (node) => {
      node.marks.forEach((mark) => {
        if (
          mark.type.name === 'comment' &&
          comments.some((comment) => comment.id === mark.attrs.commentId)
        )
          overlaps.add(mark.attrs.commentId)
      })
    })
    if (overlaps.size) {
      setActiveCommentId(overlaps.values().next().value!)
      requestTools((value) => value + 1)
      return
    }
    const comment: StoryComment = {
      id: crypto.randomUUID(),
      text: '',
      resolved: false,
      createdAt: Date.now(),
    }
    // The thread field takes focus next; a delayed editor focus would steal it on phones.
    editor.chain().setMark('comment', { commentId: comment.id }).run()
    setComments((prev) => [...prev, comment])
    setActiveCommentId(comment.id)
    requestTools((value) => value + 1)
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
        if (
          mark.type.name === 'comment' &&
          mark.attrs.commentId === commentId
        ) {
          tr.removeMark(pos, pos + node.nodeSize, mark.type)
        }
      })
    })
    if (tr.docChanged) editor.view.dispatch(tr)
  }

  /** Scrolls the anchored span for a thread into view and briefly flashes
   * it, so clicking "Jump to text" in the Comments tab is easy to follow. */
  function scrollToComment(commentId: string) {
    const el = [
      ...document.querySelectorAll<HTMLElement>('.story-comment'),
    ].find((element) => element.dataset.commentId === commentId)
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
      {
        id: 'story-snapshot',
        label: 'Save snapshot',
        run: () => void handleSnapshot(),
      },
      {
        id: 'story-go-history',
        label: 'View version history',
        run: () => navigate(`/${story?.kind ?? 'story'}/${id}/history`),
      },
    ]
    // handleSnapshot closes over title/body and is recreated every render
    // (not memoized) — included so a stale snapshot is never captured.
  }, [id, focusMode, navigate, handleSnapshot, story.kind])

  useRegisterCommands('story-page', storyCommands)

  const fontFamily =
    settings.editorFont === 'serif' ? 'var(--font-display)' : 'var(--font-sans)'

  return (
    <>
      <WritingWorkspace
        documentId={id}
        toolsRequest={toolsRequest}
        actions={
          <>
            <div className="wr-action-group">
              <button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                aria-pressed={focusMode}
                className={toolbarPill(focusMode)}
              >
                Focus
              </button>
              <CheckpointButton save={handleSnapshot} />
              <Link
                to={`/${story?.kind ?? 'story'}/${id}/history`}
                className="shrink-0 whitespace-nowrap py-1.5 text-ink/50 hover:text-indigo sm:py-0"
              >
                History
              </Link>
            </div>

            <div className="wr-action-group">
              {story.kind === 'idea' && (
                <DevelopIdeaButton id={id} prepare={saving.flushRequired} />
              )}
              <ExportMenu
                title={title}
                body={displayBody}
                richContent={format === 'rich' ? content : undefined}
              />
              <SettingsPanel compact />
            </div>
          </>
        }
        before={
          <>
            <FindReplacePanel
              body={body}
              onChange={setBody}
              plain={format === 'plain'}
              editor={richEditor}
              getTextarea={() => surfaceRef.current?.getTextarea?.() ?? null}
            />
            {format === 'rich' && (
              <RichToolbar
                editor={richEditor}
                onAddComment={handleAddComment}
              />
            )}
          </>
        }
        tools={(hidden, close) => (
          <StoryWorkbenchSidebar
            key={id}
            activeWord={activeWord}
            body={displayBody}
            onInsert={(word) =>
              (format === 'rich'
                ? richRef.current
                : surfaceRef.current
              )?.insertText(word)
            }
            hidden={hidden}
            onClose={close}
            commentsProps={
              format === 'rich'
                ? {
                    comments,
                    doc: content,
                    activeCommentId,
                    focusRequest: commentFocusRequest,
                    onEdit: (cid, text) =>
                      setComments((prev) =>
                        prev.map((c) => (c.id === cid ? { ...c, text } : c)),
                      ),
                    onResolveToggle: (cid) =>
                      setComments((prev) =>
                        prev.map((c) =>
                          c.id === cid ? { ...c, resolved: !c.resolved } : c,
                        ),
                      ),
                    onDelete: (cid) => {
                      setActiveCommentId(null)
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
        )}
      >
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
          <div
            className={`writing-column writing-width-${settings.writingWidth} ${focusMode ? 'is-focused' : ''}`}
          >
            <DocumentLabel
              kind={story.kind ?? 'story'}
              status={story.status}
              sourceIdeaId={story.sourceIdeaId}
            >
              <SaveStatus
                state={saving.state}
                retry={() => void saving.flush()}
              />
            </DocumentLabel>
            <DocumentTitle
              title={title}
              onChange={setTitle}
              label={story.kind === 'idea' ? 'Idea title' : 'Story title'}
            />

            <p className="wr-document-counts">
              {wordCount.toLocaleString()} word{wordCount === 1 ? '' : 's'} ·{' '}
              {paragraphCount} paragraph
              {paragraphCount === 1 ? '' : 's'} · ~{readingMinutes} min read
            </p>

            {format === 'rich' ? (
              <RichStoryEditor
                key={id}
                ref={richRef}
                content={content}
                onChange={(next, text) => {
                  setContent(next)
                  setBody(text)
                }}
                onActiveWordChange={setActiveWord}
                onEditor={setRichEditor}
                fontFamily={fontFamily}
                fontSize={settings.fontSize}
                lineHeight={settings.lineHeight}
              />
            ) : (
              <PlainStoryEditor
                ref={surfaceRef}
                onEditor={setRichEditor}
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
      </WritingWorkspace>
      {printing && (
        <PrintableStory
          title={title}
          format={format}
          body={displayBody}
          content={format === 'rich' ? content : undefined}
        />
      )}
    </>
  )
}
