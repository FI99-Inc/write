import { describe, expect, it } from 'vitest'
import { findTextMatches, replaceTextMatches, lineRange } from '@/engines/findReplace'
import { getStorySchema } from '@/engines/richText/extensions'
import { findRichMatches } from '@/engines/richText/search'
const options = { caseSensitive: false, wholeWord: false }
describe('document find and replace', () => {
  it('searches literal punctuation and replaces dollar signs literally', () => {
    const text = 'a+b A+B ab'
    const matches = findTextMatches(text, 'a+b', options)
    expect(matches).toEqual([
      { from: 0, to: 3 },
      { from: 4, to: 7 },
    ])
    expect(replaceTextMatches(text, matches, '$&')).toBe('$& $& ab')
  })
  it('uses Unicode word edges and explicit case sensitivity', () => {
    expect(
      findTextMatches('étoile étoilettes ÉTOILE', 'étoile', {
        caseSensitive: false,
        wholeWord: true,
      }),
    ).toHaveLength(2)
    expect(
      findTextMatches('cat cat_ cat2 cats cat', 'cat', { caseSensitive: true, wholeWord: true }),
    ).toHaveLength(2)
    expect(
      findTextMatches('Cat cat', 'cat', { caseSensitive: true, wholeWord: false }),
    ).toHaveLength(1)
  })
  it('finds across formatting marks but never crosses paragraph boundaries', () => {
    const schema = getStorySchema()
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'hel', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'lo' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'world' }] },
      ],
    })
    expect(findRichMatches(doc, 'hello', options)).toEqual([{ from: 1, to: 6 }])
    expect(findRichMatches(doc, 'helloworld', options)).toEqual([])
  })
  it('handles empty queries, capped matches, and line navigation', () => {
    expect(findTextMatches('aaa', '', options)).toEqual([])
    expect(findTextMatches('aaaa', 'a', options, 2)).toHaveLength(2)
    expect(lineRange('a\nbc\nd', 2)).toEqual({ from: 2, to: 4 })
    expect(lineRange('a', 9)).toEqual({ from: 1, to: 1 })
  })
})
