import { useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { poemToPlainText, poemToMarkdown, slugifyFilename } from '@/features/editor/exportPoem'
import { docToHtml, docToMarkdown } from '@/engines/richText/serialize'
import { useRegisterCommands, type Command } from '@/engines/useCommandPalette'

interface ExportMenuProps {
  title: string
  body: string
  /** When present, the story is rich: `.md` renders formatting via
   * docToMarkdown, and a `.html` download becomes available. When absent,
   * export behaves exactly as it always has for plain stories. */
  richContent?: JSONContent
}

/** Escapes HTML special characters so untrusted text (e.g. a user-supplied
 * title) can be safely interpolated into raw HTML markup. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportMenu({ title, body, richContent }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(poemToPlainText(title, body))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleDownloadTxt() {
    downloadTextFile(poemToPlainText(title, body), `${slugifyFilename(title)}.txt`, 'text/plain')
    setOpen(false)
  }

  function handleDownloadMarkdown() {
    const md = richContent ? docToMarkdown(title, richContent) : poemToMarkdown(title, body)
    downloadTextFile(md, `${slugifyFilename(title)}.md`, 'text/markdown')
    setOpen(false)
  }

  function handleDownloadHtml() {
    if (!richContent) return
    const safeTitle = escapeHtml(title || 'Untitled')
    const page = `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body><h1>${safeTitle}</h1>${docToHtml(richContent)}</body></html>`
    downloadTextFile(page, `${slugifyFilename(title)}.html`, 'text/html')
    setOpen(false)
  }

  function handlePrint() {
    setOpen(false)
    window.print()
  }

  const commands = useMemo<Command[]>(
    () => [
      { id: 'export-copy', label: 'Copy to clipboard', run: () => void handleCopy() },
      { id: 'export-txt', label: 'Download as .txt', run: handleDownloadTxt },
      { id: 'export-md', label: 'Download as .md', run: handleDownloadMarkdown },
      ...(richContent
        ? [{ id: 'export-html', label: 'Download as .html', run: handleDownloadHtml }]
        : []),
      { id: 'export-pdf', label: 'Export as PDF (print)', run: handlePrint },
    ],
    // Every handler closes over the latest title/body/richContent props and
    // is recreated each render (not memoized) — recomputing every render
    // keeps the palette from ever running a stale copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, body, richContent],
  )
  useRegisterCommands('export-menu', commands)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-ink/50 hover:text-indigo"
      >
        Export
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close export menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-48 space-y-1 rounded-lg border border-canvas-line bg-paper p-2 text-sm shadow-lg">
            <button
              type="button"
              onClick={handleCopy}
              className="block w-full rounded px-3 py-2 text-left text-ink/70 hover:bg-canvas hover:text-indigo"
            >
              {copied ? 'Copied ✓' : 'Copy to clipboard'}
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="block w-full rounded px-3 py-2 text-left text-ink/70 hover:bg-canvas hover:text-indigo"
            >
              Download .txt
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="block w-full rounded px-3 py-2 text-left text-ink/70 hover:bg-canvas hover:text-indigo"
            >
              Download .md
            </button>
            {richContent && (
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="block w-full rounded px-3 py-2 text-left text-ink/70 hover:bg-canvas hover:text-indigo"
              >
                Download .html
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="block w-full rounded px-3 py-2 text-left text-ink/70 hover:bg-canvas hover:text-indigo"
            >
              Export PDF (print)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
