import type { JSONContent } from '@tiptap/core'
import { slugifyFilename } from '@/features/editor/exportPoem'
export function downloadDocx(title: string, body: string, content?: JSONContent): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' })
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('Word export took too long. Export a smaller chapter or use Markdown.'))
    }, 30_000)
    const finish = () => {
      clearTimeout(timer)
      worker.terminate()
    }
    worker.onerror = () => {
      finish()
      reject(new Error('Could not create this Word document. Please try again.'))
    }
    worker.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; error?: string }>) => {
      finish()
      if (event.data.error) {
        reject(new Error(event.data.error))
        return
      }
      const url = URL.createObjectURL(
        new Blob([event.data.buffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = `${slugifyFilename(title)}.docx`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve()
    }
    worker.postMessage([title, body, content])
  })
}
