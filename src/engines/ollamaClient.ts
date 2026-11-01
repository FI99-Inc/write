export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class OllamaError extends Error {
  readonly cause: 'network' | 'http' | 'parse'

  constructor(message: string, cause: 'network' | 'http' | 'parse') {
    super(message)
    this.name = 'OllamaError'
    this.cause = cause
  }
}

function trimEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '')
}

/** Lists model names installed on the user's local Ollama instance
 * (GET /api/tags) — used to populate the model picker in Settings. Throws
 * OllamaError with a cause of 'network' when the request never reaches
 * Ollama at all, which in a browser almost always means either Ollama isn't
 * running or it's running without CORS enabled for this origin. */
export async function listOllamaModels(endpoint: string): Promise<string[]> {
  let response: Response
  try {
    response = await fetch(`${trimEndpoint(endpoint)}/api/tags`)
  } catch {
    throw new OllamaError(
      "Couldn't reach Ollama. Is it running? If so, it likely needs CORS enabled for this page — start it with OLLAMA_ORIGINS=* (or this app's origin) set in its environment.",
      'network',
    )
  }
  if (!response.ok) {
    throw new OllamaError(`Ollama responded with an error (HTTP ${response.status}).`, 'http')
  }
  try {
    const data = (await response.json()) as { models?: { name: string }[] }
    return (data.models ?? []).map((m) => m.name)
  } catch {
    throw new OllamaError('Ollama returned a response this app could not understand.', 'parse')
  }
}

/** Sends a chat turn to a local Ollama instance (POST /api/chat, non
 * streaming) and returns the assistant's reply text. */
export async function askOllama(
  endpoint: string,
  model: string,
  messages: OllamaMessage[],
  signal?: AbortSignal,
): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${trimEndpoint(endpoint)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      ...(signal ? { signal } : {}),
    })
  } catch {
    throw new OllamaError(
      "Couldn't reach Ollama. Is it running? If so, it likely needs CORS enabled for this page — start it with OLLAMA_ORIGINS=* (or this app's origin) set in its environment.",
      'network',
    )
  }
  if (!response.ok) {
    throw new OllamaError(`Ollama responded with an error (HTTP ${response.status}).`, 'http')
  }
  try {
    const data = (await response.json()) as { message?: { content?: string } }
    const content = data.message?.content
    if (typeof content !== 'string') throw new Error('missing content')
    return content
  } catch {
    throw new OllamaError('Ollama returned a response this app could not understand.', 'parse')
  }
}
