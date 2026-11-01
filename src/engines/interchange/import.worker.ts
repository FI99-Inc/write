import mammoth from 'mammoth/mammoth.browser'
import { marked } from 'marked'
self.onmessage = async (
  event: MessageEvent<{ kind: 'docx'; buffer: ArrayBuffer } | { kind: 'markdown'; text: string }>,
) => {
  try {
    let html: string
    const warnings: string[] = []
    if (event.data.kind === 'docx') {
      let imageCount = 0
      const result = await mammoth.convertToHtml(
        { arrayBuffer: event.data.buffer },
        {
          externalFileAccess: false,
          includeEmbeddedStyleMap: false,
          ignoreEmptyParagraphs: false,
          styleMap: [
            'u => u',
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Code'] => pre:fresh",
          ],
          convertImage: mammoth.images.imgElement(async () => {
            imageCount++
            return { src: '' }
          }),
        },
      )
      html = result.value
      warnings.push(...result.messages.map((message) => message.message).slice(0, 30))
      if (imageCount)
        warnings.push(
          `${imageCount} image(s) omitted. This editor imports writing and basic formatting.`,
        )
    } else html = await marked.parse(event.data.text, { async: false })
    if (html.length > 8_000_000)
      throw new Error(
        'The converted document is too large. Split it into smaller chapters and try again.',
      )
    self.postMessage({ html, warnings })
  } catch (reason) {
    self.postMessage({
      error: reason instanceof Error ? reason.message : 'Could not convert this document.',
    })
  }
}
