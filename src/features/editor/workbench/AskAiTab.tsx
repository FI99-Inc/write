import { useEffect, useRef, useState } from 'react'
import { useSettings } from '@/engines/useSettings'
import { askOllama, OllamaError, type OllamaMessage } from '@/engines/ollamaClient'

interface AskAiTabProps {
  body: string
}

const SYSTEM_PROMPT =
  'You are a writing assistant. The writer will share a poem, story, idea, note, or research fragment and ask about ideas, structure, imagery, word choices, or craft. Be concise and specific. Do not rewrite their work unless they explicitly ask you to.'

export function AskAiTab({ body }: AskAiTabProps) {
  const { settings } = useSettings()
  const [messages, setMessages] = useState<OllamaMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  if (!settings.aiEnabled) {
    return (
      <div className="space-y-2 text-sm text-ink/50">
        <p>
          Ask AI is off. It&rsquo;s an optional feature that talks to a local Ollama instance you
          run yourself.
        </p>
        <p>Turn it on in Settings to use it — the app works fully offline without it either way.</p>
      </div>
    )
  }

  if (!settings.ollamaModel) {
    return (
      <div className="space-y-2 text-sm text-ink/50">
        <p>No model selected yet.</p>
        <p>Open Settings and use &ldquo;Check connection / list models&rdquo; to pick one.</p>
      </div>
    )
  }

  async function handleSend() {
    const question = draft.trim()
    if (!question || sending) return

    const userMessage: OllamaMessage = { role: 'user', content: question }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setDraft('')
    setSending(true)
    setError('')

    const controller = new AbortController()
    request.current = controller
    const timeout = setTimeout(() => controller.abort(), 90_000)
    try {
      const context: OllamaMessage = {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nCurrent writing:\n\n${body || '(nothing written yet)'}`,
      }
      const reply = await askOllama(
        settings.ollamaEndpoint,
        settings.ollamaModel,
        [context, ...nextMessages],
        controller.signal,
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof OllamaError ? err.message : 'Something went wrong reaching Ollama.')
    } finally {
      clearTimeout(timeout)
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-xs text-ink/40">
        Using <span className="font-medium text-ink/60">{settings.ollamaModel}</span> at{' '}
        {settings.ollamaEndpoint}. Your question includes the current writing. Choose a local
        endpoint to keep it on your machine.
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-ink/40">
            Ask about an image, a word choice, where the poem might go next…
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'bg-canvas text-ink'
                : 'border border-canvas-line text-ink/80'
            }`}
          >
            {message.content}
          </div>
        ))}
        {sending && <p className="text-xs text-ink/40">Thinking…</p>}
        {error && <p className="text-xs text-berry">{error}</p>}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          aria-label="Ask about your writing"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder="Ask something…"
          rows={2}
          className="flex-1 resize-none rounded border border-canvas-line bg-canvas px-2 py-1.5 text-sm outline-none focus:border-indigo"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || draft.trim().length === 0}
          className="rounded-full bg-indigo px-4 py-1.5 text-sm text-paper transition-colors hover:bg-indigo-soft disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
