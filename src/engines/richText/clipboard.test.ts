import { Editor } from '@tiptap/core'
import { storyExtensions } from '@/engines/richText/extensions'
import { describe, expect, it } from 'vitest'
import { normalizeClipboardHtml, parseClipboardText } from '@/engines/richText/clipboard'
import { docToPlainText, plainTextToDoc } from '@/engines/richText/projection'
import { docToMarkdown } from '@/engines/richText/serialize'

describe('clipboard fidelity', () => {
  it.each([
    'Alpha\nBeta',
    'Alpha\n\nBeta',
    'Alpha\n\n\nBeta',
    'Alpha\n\n\n\nBeta',
    '\nAlpha\n',
    '',
  ])('preserves every plain-text break in %j', (text) => {
    expect(docToPlainText(plainTextToDoc(text))).toBe(text)
    expect(parseClipboardText(text).content.size).toBeGreaterThanOrEqual(2)
  })
  it('normalizes CRLF without manufacturing extra paragraphs', () => {
    expect(docToPlainText(plainTextToDoc('A\r\nB\rC'))).toBe('A\nB\nC')
  })
  it('keeps structural and basic formatting but strips foreign style and comment identities', () => {
    const html = normalizeClipboardHtml(
      '<h2 class="word">Heading</h2><p style="margin:40px"><span style="font-weight:700;font-style:italic;color:red" data-comment-id="foreign">Text</span><br>next</p><ul><li>Item</li></ul>',
    )
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelector('h2')?.textContent).toBe('Heading')
    expect(
      container.querySelector('strong em')?.textContent ??
        container.querySelector('em strong')?.textContent,
    ).toBe('Text')
    expect(container.querySelectorAll('[style],[class],[data-comment-id]')).toHaveLength(0)
    expect(container.querySelectorAll('br')).toHaveLength(1)
    expect(container.querySelector('li')?.textContent).toBe('Item')
  })
  it('exports hard breaks, all list paragraphs and nested lists without dropping text', () => {
    const output = docToMarkdown('Title', {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'first' },
            { type: 'hardBreak' },
            { type: 'text', text: 'second' },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 4 },
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'continued' }] },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nested' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(output).toContain('first  \nsecond')
    expect(output).toContain('4. one')
    expect(output).toContain('continued')
    expect(output).toContain('- nested')
  })
})

it('inserts a clipboard slice into the actual live editor schema and undoes it as one action', () => {
  const element = document.createElement('div')
  document.body.append(element)
  const editor = new Editor({
    element,
    extensions: storyExtensions,
    content: plainTextToDoc(''),
    editorProps: {
      clipboardTextParser: parseClipboardText,
      transformPastedHTML: normalizeClipboardHtml,
    },
  })
  try {
    editor.view.pasteText('Alpha\nBeta\n\n\nGamma', new Event('paste') as ClipboardEvent)
    expect(docToPlainText(editor.getJSON())).toBe('Alpha\nBeta\n\n\nGamma')
    expect(editor.commands.undo()).toBe(true)
    expect(docToPlainText(editor.getJSON())).toBe('')
  } finally {
    editor.destroy()
    element.remove()
  }
})
