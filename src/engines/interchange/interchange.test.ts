import { describe, expect, it } from 'vitest'
import mammoth from 'mammoth'
import { parseImportedHtml } from '@/engines/interchange/importDocument'
import { documentToDocx } from '@/engines/interchange/exportDocx'
import { plainTextToDoc } from '@/engines/richText/projection'

describe('local document interchange', () => {
  it('removes active content and foreign styling before schema parsing', () => {
    const result = parseImportedHtml(
      '<h1>Title</h1><script>alert(1)</script><p onclick="bad()"><span style="font-weight:bold;color:red">Safe</span><a href="javascript:alert(1)">link</a><img src="https://invalid.test/tracker" alt="Alt"/><svg onload="bad()"></svg></p>',
      'File',
    )
    expect(result.title).toBe('Title')
    expect(result.body).toContain('Safe')
    const encoded = JSON.stringify(result.content)
    expect(encoded).not.toMatch(/javascript|onclick|tracker|alert|textStyle|svg/)
    expect(encoded).toContain('bold')
  })
  it('round-trips an actual Word archive with headings, marks, lists and line breaks', async () => {
    const source = parseImportedHtml(
      '<h1>Book</h1><h2>Chapter</h2><p><strong>Bold</strong> <em>italic</em> <u>underline</u><br/>next line</p><ol start="3"><li><p>Third</p><ul><li><p>Nested</p></li></ul></li></ol><p><a href="https://example.com">A link</a></p>',
      'fallback',
    )
    const bytes = await documentToDocx(source.title, source.body, source.content)
    expect(new Uint8Array(bytes).slice(0, 2)).toEqual(new Uint8Array([80, 75]))
    const converted = await mammoth.convertToHtml(
      { buffer: Buffer.from(bytes) },
      {
        ignoreEmptyParagraphs: false,
        styleMap: [
          'u => u',
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Code'] => pre:fresh",
        ],
      },
    )
    const restored = parseImportedHtml(converted.value, 'fallback')
    expect(restored.title).toBe('Book')
    for (const phrase of [
      'Chapter',
      'Bold italic underline',
      'next line',
      'Third',
      'Nested',
      'A link',
    ])
      expect(restored.body).toContain(phrase)
    const encoded = JSON.stringify(restored.content)
    for (const mark of [
      'bold',
      'italic',
      'underline',
      'heading',
      'orderedList',
      'bulletList',
      'hardBreak',
      'link',
    ])
      expect(encoded).toContain(mark)
  })
  it('preserves plain poetry line and stanza breaks in Word export', async () => {
    const body = 'One\nTwo\n\n\nFour'
    const bytes = await documentToDocx('Poem', body)
    const converted = await mammoth.convertToHtml(
      { buffer: Buffer.from(bytes) },
      {
        ignoreEmptyParagraphs: false,
        styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Code'] => pre:fresh"],
      },
    )
    expect(parseImportedHtml(converted.value, 'Poem').body).toBe(body)
    expect(plainTextToDoc(body).content).toHaveLength(2)
  })
  it('retains multiline code and literal inline newlines through Word', async () => {
    const content = {
      type: 'doc',
      content: [{ type: 'codeBlock', content: [{ type: 'text', text: 'first\nsecond' }] }],
    }
    const bytes = await documentToDocx('Code', 'first\nsecond', content)
    const result = await mammoth.convertToHtml(
      { buffer: Buffer.from(bytes) },
      { styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Code'] => pre:fresh"] },
    )
    const restored = parseImportedHtml(result.value, 'Code')
    expect(restored.body).toBe('first\nsecond')
    expect(restored.content.content?.[0].type).toBe('codeBlock')
  })
})
