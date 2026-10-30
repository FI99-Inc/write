import type { JSONContent } from '@tiptap/core'
import type { StoryComment } from '@/types/story'

/** Preserve every thread, including detached notes; remove only anchors with no thread. */
export function reconcileCommentAnchors(doc: JSONContent, comments: StoryComment[]): JSONContent {
  const ids = new Set(comments.map((comment) => comment.id))
  function visit(node: JSONContent): JSONContent {
    return {
      ...node,
      ...(node.marks
        ? {
            marks: node.marks.filter(
              (mark) => mark.type !== 'comment' || ids.has(mark.attrs?.commentId),
            ),
          }
        : {}),
      ...(node.content ? { content: node.content.map(visit) } : {}),
    }
  }
  return visit(doc)
}
