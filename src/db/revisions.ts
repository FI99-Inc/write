import type { JSONContent } from '@tiptap/core'
import { db } from '@/db/schema'
import { createSnapshot } from '@/db/snapshots'
import { updatePoem } from '@/db/poems'
import { updateStory } from '@/db/stories'
import type { DocKind } from '@/types/libraryDoc'
import type { StoryComment } from '@/types/story'
import { docToPlainText, plainTextToDoc } from '@/engines/richText/projection'
import { reconcileCommentAnchors } from '@/engines/richText/reconcileComments'

export async function nameSnapshot(id: string, label: string): Promise<void> {
  if (label.trim().length > 200)
    throw new Error('Use a checkpoint name of 200 characters or fewer.')
  await db.snapshots.update(id, { label: label.trim() || undefined })
}
export interface PassageRange {
  from: number
  to: number
}
function checked(range: PassageRange, size: number, allowEmpty = false) {
  if (
    !Number.isSafeInteger(range.from) ||
    !Number.isSafeInteger(range.to) ||
    range.from < 1 ||
    range.from > size + (allowEmpty ? 1 : 0) ||
    range.to > size ||
    range.to < range.from - (allowEmpty ? 1 : 0)
  )
    throw new Error('Choose a valid passage range.')
}
/** Restore selected top-level blocks in rich writing, or lines in plain writing. */
export async function restorePassage(input: {
  id: string
  kind: DocKind
  snapshotId: string
  source: PassageRange
  target: PassageRange
  expectedSavedAt: number
  expectedBody: string
}): Promise<void> {
  await db.transaction('rw', [db.poems, db.stories, db.snapshots], async () => {
    const snapshot = await db.snapshots.get(input.snapshotId)
    const current =
      input.kind === 'poem' ? await db.poems.get(input.id) : await db.stories.get(input.id)
    if (!snapshot || snapshot.poemId !== input.id || !current || current.deletedAt)
      throw new Error('This writing or version is no longer available.')
    if (
      (current.draftSavedAt ?? current.modifiedAt) !== input.expectedSavedAt ||
      current.body !== input.expectedBody
    )
      throw new Error(
        'Your writing changed. Review the current version before restoring this passage.',
      )
    if ('format' in current && current.format === 'rich') {
      const source = snapshot.content ?? plainTextToDoc(snapshot.body)
      const target = current.content ?? plainTextToDoc(current.body)
      const sourceBlocks = source.content ?? [],
        targetBlocks = target.content ?? []
      checked(input.source, sourceBlocks.length)
      checked(input.target, targetBlocks.length, true)
      const inserted: JSONContent[] = structuredClone(
        sourceBlocks.slice(input.source.from - 1, input.source.to),
      )
      const commentMap = new Map<string, string>()
      const sourceComments = new Map(
        (snapshot.comments ?? []).map((comment) => [comment.id, comment]),
      )
      const addedComments: StoryComment[] = []
      const visit = (node: JSONContent) => {
        for (const mark of node.marks ?? [])
          if (mark.type === 'comment') {
            const oldId = String(mark.attrs?.commentId ?? '')
            const thread = sourceComments.get(oldId)
            if (!thread) continue
            if (!commentMap.has(oldId)) {
              const id = crypto.randomUUID()
              commentMap.set(oldId, id)
              addedComments.push({ ...thread, id })
            }
            mark.attrs = { ...mark.attrs, commentId: commentMap.get(oldId) }
          }
        node.content?.forEach(visit)
      }
      inserted.forEach(visit)
      const blocks = [...targetBlocks]
      blocks.splice(input.target.from - 1, input.target.to - input.target.from + 1, ...inserted)
      const comments = [...(current.comments ?? []), ...addedComments]
      const content = reconcileCommentAnchors(
        { type: 'doc', content: blocks.length ? blocks : plainTextToDoc('').content },
        comments,
      )
      await createSnapshot(
        current.id,
        current.title,
        current.body,
        'Before passage restore',
        current.content,
        current.comments,
      )
      await updateStory(current.id, { content, comments, body: docToPlainText(content) })
    } else {
      const source = snapshot.body.split('\n'),
        target = current.body.split('\n')
      checked(input.source, source.length)
      checked(input.target, target.length, true)
      target.splice(
        input.target.from - 1,
        input.target.to - input.target.from + 1,
        ...source.slice(input.source.from - 1, input.source.to),
      )
      await createSnapshot(current.id, current.title, current.body, 'Before passage restore')
      await (input.kind === 'poem' ? updatePoem : updateStory)(current.id, {
        body: target.join('\n'),
      })
    }
  })
}
