import { EditorState } from '@tiptap/pm/state'
import { describe, it, expect } from 'vitest'
import { collectCommentIds, partitionComments } from '@/engines/richText/comments'
import { getStorySchema } from '@/engines/richText/extensions'
import type { StoryComment } from '@/types/story'

const docWithComment = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Look at ' },
        {
          type: 'text',
          marks: [{ type: 'comment', attrs: { commentId: 'c1' } }],
          text: 'this line',
        },
        { type: 'text', text: ' closely.' },
      ],
    },
  ],
}

const thread = (id: string): StoryComment => ({ id, text: 'note', resolved: false, createdAt: 1 })

describe('collectCommentIds', () => {
  it('finds anchored comment ids', () => {
    expect(collectCommentIds(docWithComment)).toEqual(new Set(['c1']))
  })
  it('returns empty for a doc with no comments', () => {
    expect(collectCommentIds({ type: 'doc', content: [] })).toEqual(new Set())
  })
})

describe('partitionComments', () => {
  it('separates anchored threads from detached ones', () => {
    const { anchored, detached } = partitionComments([thread('c1'), thread('gone')], docWithComment)
    expect(anchored.map((c) => c.id)).toEqual(['c1'])
    expect(detached.map((c) => c.id)).toEqual(['gone'])
  })
})

describe('anchor survives edits (ProseMirror mapping)', () => {
  it('keeps the comment on the same words after inserting text before it', () => {
    const schema = getStorySchema()
    const node = schema.nodeFromJSON(docWithComment)
    // Find the commented range in the resolved document.
    let from = -1
    let to = -1
    node.descendants((child, pos) => {
      if (child.isText && child.marks.some((m) => m.type.name === 'comment')) {
        from = pos
        to = pos + child.nodeSize
      }
    })
    const state = EditorState.create({ schema, doc: node })
    const transaction = state.tr.insertText('Opening words ', 1)
    const updated = state.apply(transaction)
    expect(updated.doc.textContent).toContain('Opening words ')
    expect(
      updated.doc.textBetween(transaction.mapping.map(from), transaction.mapping.map(to)),
    ).toBe('this line')
    let anchoredText = ''
    updated.doc.descendants((child) => {
      if (child.isText && child.marks.some((mark) => mark.type.name === 'comment'))
        anchoredText += child.text
    })
    expect(anchoredText).toBe('this line')
  })
})
