import { useEffect, useRef, useState } from 'react'
import { useSettings } from '@/engines/useSettings'
import { FONT_SIZE_RANGE, LINE_HEIGHT_RANGE } from '@/types/settings'
import { listOllamaModels, OllamaError } from '@/engines/ollamaClient'

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    function close(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
  const [models, setModels] = useState<string[]>([])
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [modelError, setModelError] = useState('')

  async function handleCheckConnection() {
    setModelStatus('loading')
    setModelError('')
    try {
      const found = await listOllamaModels(settings.ollamaEndpoint)
      setModels(found)
      setModelStatus('idle')
      if (found.length > 0 && !found.includes(settings.ollamaModel)) {
        updateSettings({ ollamaModel: found[0] })
      }
    } catch (err) {
      setModelStatus('error')
      setModelError(
        err instanceof OllamaError ? err.message : 'Something went wrong reaching Ollama.',
      )
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="writing-settings"
        className="header-action"
      >
        Settings
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          {/* Capped and scrollable: the full panel is taller than a phone in
           * landscape, and it's anchored to a header that doesn't scroll. */}
          <div
            id="writing-settings"
            role="region"
            aria-label="Writing settings"
            className="absolute right-0 z-20 mt-2 max-h-[75dvh] w-72 space-y-4 overflow-y-auto rounded-lg border border-canvas-line bg-paper p-4 text-sm shadow-lg"
          >
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink/40">Theme</p>
              <div className="flex gap-1 rounded-full border border-canvas-line p-0.5">
                {(['light', 'dark'] as const).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => updateSettings({ theme })}
                    aria-pressed={settings.theme === theme}
                    className={`flex-1 rounded-full py-1 text-xs capitalize ${
                      settings.theme === theme ? 'bg-indigo text-paper' : 'text-ink/60'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-ink/40">Writing pane font</p>
              <div className="flex gap-1 rounded-full border border-canvas-line p-0.5">
                {(['serif', 'sans'] as const).map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => updateSettings({ editorFont: font })}
                    aria-pressed={settings.editorFont === font}
                    className={`flex-1 rounded-full py-1 text-xs capitalize ${
                      settings.editorFont === font ? 'bg-indigo text-paper' : 'text-ink/60'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="font-size-range" className="text-xs font-medium text-ink/40">
                  Text size
                </label>
                <span className="text-xs text-ink/40">{settings.fontSize}px</span>
              </div>
              <input
                id="font-size-range"
                type="range"
                min={FONT_SIZE_RANGE.min}
                max={FONT_SIZE_RANGE.max}
                step={FONT_SIZE_RANGE.step}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="line-height-range" className="text-xs font-medium text-ink/40">
                  Line height
                </label>
                <span className="text-xs text-ink/40">{settings.lineHeight}px</span>
              </div>
              <input
                id="line-height-range"
                type="range"
                min={LINE_HEIGHT_RANGE.min}
                max={LINE_HEIGHT_RANGE.max}
                step={LINE_HEIGHT_RANGE.step}
                value={settings.lineHeight}
                onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-ink/40">New stories open in</p>
              <div className="flex gap-1 rounded-full border border-canvas-line p-0.5">
                {(['rich', 'plain'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateSettings({ storyEditorMode: mode })}
                    aria-pressed={settings.storyEditorMode === mode}
                    className={`flex-1 rounded-full py-1 text-xs capitalize ${
                      settings.storyEditorMode === mode ? 'bg-indigo text-paper' : 'text-ink/60'
                    }`}
                  >
                    {mode === 'rich' ? 'Rich text' : 'Plain text'}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink/40">
                Affects new stories only. Existing stories keep the editor they were created with.
              </p>
            </div>

            <div className="border-t border-canvas-line pt-4">
              <label className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink/40">Ask AI (optional)</span>
                <input
                  type="checkbox"
                  checked={settings.aiEnabled}
                  onChange={(e) => updateSettings({ aiEnabled: e.target.checked })}
                />
              </label>
              <p className="mt-1 text-xs leading-relaxed text-ink/40">
                Off by default. When on, the &ldquo;Ask AI&rdquo; tab talks directly to a local{' '}
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-indigo"
                >
                  Ollama
                </a>{' '}
                endpoint you choose. Questions include your current writing. A local endpoint keeps
                it on your machine; a remote endpoint receives that writing.
              </p>

              {settings.aiEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label
                      htmlFor="ollama-endpoint"
                      className="mb-1 block text-xs font-medium text-ink/40"
                    >
                      Ollama endpoint
                    </label>
                    <input
                      id="ollama-endpoint"
                      type="text"
                      value={settings.ollamaEndpoint}
                      onChange={(e) => updateSettings({ ollamaEndpoint: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full rounded border border-canvas-line bg-canvas px-2 py-1.5 text-xs outline-none focus:border-indigo"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckConnection}
                    disabled={modelStatus === 'loading'}
                    className="w-full rounded-full border border-canvas-line py-1.5 text-xs text-ink/60 transition-colors hover:border-indigo hover:text-indigo disabled:opacity-50"
                  >
                    {modelStatus === 'loading' ? 'Checking…' : 'Check connection / list models'}
                  </button>

                  {modelStatus === 'error' && <p className="text-xs text-berry">{modelError}</p>}

                  {models.length > 0 && (
                    <div>
                      <label
                        htmlFor="ollama-model"
                        className="mb-1 block text-xs font-medium text-ink/40"
                      >
                        Model
                      </label>
                      <select
                        id="ollama-model"
                        value={settings.ollamaModel}
                        onChange={(e) => updateSettings({ ollamaModel: e.target.value })}
                        className="w-full rounded border border-canvas-line bg-canvas px-2 py-1.5 text-xs outline-none focus:border-indigo"
                      >
                        {models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-canvas-line pt-4">
              <label className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink/40">Online extras (optional)</span>
                <input
                  type="checkbox"
                  checked={settings.onlineExtrasEnabled}
                  onChange={(e) => updateSettings({ onlineExtrasEnabled: e.target.checked })}
                />
              </label>
              <p className="mt-1 text-xs leading-relaxed text-ink/40">
                Off by default. When on, the Rhymes and Thesaurus tabs also check{' '}
                <a
                  href="https://www.datamuse.com/api/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-indigo"
                >
                  Datamuse
                </a>{' '}
                (a free, keyless word-lookup API) for extra matches beyond the bundled dictionary —
                the app works fully offline without it.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
