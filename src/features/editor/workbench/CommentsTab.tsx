import { useEffect, useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { StoryComment } from '@/types/story'
import { partitionComments } from '@/engines/richText/comments'

export interface CommentsTabProps {
  comments: StoryComment[]
  doc: JSONContent
  activeCommentId: string | null
  focusRequest?: number
  onEdit: (id: string, text: string) => void
  onResolveToggle: (id: string) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

/** Lists comment threads left on the rich story: anchored ones (still tied
 * to live text via the `comment` mark) grouped separately from detached ones
 * (their anchor text was deleted, but the thread itself is preserved rather
 * than silently dropped — see `partitionComments`). */
export function CommentsTab({
  comments,
  doc,
  activeCommentId,
  focusRequest,
  onEdit,
  onResolveToggle,
  onDelete,
  onSelect,
}: CommentsTabProps) {
  const activeField = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    activeField.current?.focus()
  }, [activeCommentId, focusRequest])
  const { anchored, detached } = partitionComments(comments, doc)

  if (comments.length === 0) {
    return (
      <p className="text-sm text-ink/40">
        Select text and click &ldquo;Comment&rdquo; to leave a note anchored to it.
      </p>
    )
  }

  const card = (comment: StoryComment, isDetached: boolean) => (
    <div
      key={comment.id}
      className={`rounded border p-2 ${comment.id === activeCommentId ? 'border-indigo' : 'border-canvas-line'} ${comment.resolved ? 'opacity-50' : ''}`}
    >
      {!isDetached && (
        <button
          type="button"
          onClick={() => onSelect(comment.id)}
          className="mb-1 text-xs text-indigo hover:underline"
        >
          Jump to text
        </button>
      )}
      {isDetached && <p className="mb-1 text-xs text-berry">Anchor text was deleted</p>}
      <textarea
        ref={comment.id === activeCommentId ? activeField : null}
        aria-label="Comment text"
        value={comment.text}
        onChange={(e) => onEdit(comment.id, e.target.value)}
        placeholder="Add a note…"
        rows={2}
        className="w-full resize-none rounded border border-canvas-line bg-canvas px-2 py-1 text-sm outline-none focus:border-indigo"
      />
      <div className="mt-1 flex gap-3 text-xs">
        <button
          type="button"
          onClick={() => onResolveToggle(comment.id)}
          className="text-ink/50 hover:text-indigo"
        >
          {comment.resolved ? 'Reopen' : 'Resolve'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(comment.id)}
          className="text-ink/50 hover:text-berry"
        >
          Delete
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {anchored.map((c) => card(c, false))}
      {detached.length > 0 && (
        <>
          <p className="pt-2 text-xs font-medium text-ink/40">Detached</p>
          {detached.map((c) => card(c, true))}
        </>
      )}
    </div>
  )
}
