import { documentToDocx } from '@/engines/interchange/exportDocx'
self.onmessage = async (event: MessageEvent<Parameters<typeof documentToDocx>>) => {
  try {
    const buffer = await documentToDocx(...event.data)
    self.postMessage({ buffer }, { transfer: [buffer] })
  } catch {
    self.postMessage({
      error: 'Could not create this Word document. Try again or export as Markdown.',
    })
  }
}
