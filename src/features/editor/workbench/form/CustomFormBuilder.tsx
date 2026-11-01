import { useState } from 'react'
import { saveCustomForm } from '@/db/customForms'
import type { FormTemplate } from '@/types/form'

interface CustomFormBuilderProps {
  onSaved: (template: FormTemplate) => void
  onCancel: () => void
}

function parseSyllables(input: string): number[] | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  const parts = trimmed.split(',').map((p) => Number(p.trim()))
  return parts.every((n) => Number.isInteger(n) && n > 0) ? parts : undefined
}

function parseRefrainPairs(input: string): Record<number, number> | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  const pairs: Record<number, number> = {}
  for (const chunk of trimmed.split(',')) {
    const match = chunk.trim().match(/^(\d+)\s*=\s*(\d+)$/)
    if (!match) return undefined
    const line = Number(match[1])
    const source = Number(match[2])
    if (line <= source || source < 1) return undefined
    pairs[line] = source
  }
  return Object.keys(pairs).length > 0 ? pairs : undefined
}

export function CustomFormBuilder({ onSaved, onCancel }: CustomFormBuilderProps) {
  const [name, setName] = useState('')
  const [rhymeScheme, setRhymeScheme] = useState('')
  const [syllables, setSyllables] = useState('')
  const [refrains, setRefrains] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError('Give your form a name.')
      return
    }
    const syllablesPerLine = parseSyllables(syllables)
    if (!rhymeScheme.trim() && !syllablesPerLine) {
      setError('Provide a rhyme scheme, syllable targets, or both.')
      return
    }
    if (syllables.trim() && !syllablesPerLine) {
      setError('Use positive whole numbers for syllable targets.')
      return
    }
    const refrainPairs = parseRefrainPairs(refrains)
    if (refrains.trim() && !refrainPairs) {
      setError('Use pairs such as 4=1, referring to an earlier line.')
      return
    }
    if (rhymeScheme.trim() && !/^[a-z\s]+$/i.test(rhymeScheme)) {
      setError('Use letters for the rhyme scheme.')
      return
    }
    try {
      const template = await saveCustomForm({
        name: name.trim(),
        rhymeScheme: rhymeScheme.trim() || undefined,
        syllablesPerLine,
        refrainPairs,
      })
      onSaved(template)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this form.')
    }
  }

  return (
    <div className="space-y-3 rounded border border-canvas-line bg-canvas p-3">
      <p className="text-xs font-medium text-ink/40">New custom form</p>

      <div>
        <label className="mb-1 block text-xs text-ink/50" htmlFor="custom-name">
          Name
        </label>
        <input
          id="custom-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My form"
          className="w-full rounded border border-canvas-line bg-paper px-2 py-1 text-sm outline-none focus:border-indigo"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink/50" htmlFor="custom-rhyme">
          Rhyme scheme (optional)
        </label>
        <input
          id="custom-rhyme"
          value={rhymeScheme}
          onChange={(e) => setRhymeScheme(e.target.value)}
          placeholder="ABAB CDCD EFEF GG"
          className="w-full rounded border border-canvas-line bg-paper px-2 py-1 text-sm outline-none focus:border-indigo"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink/50" htmlFor="custom-syllables">
          Syllables per line (optional)
        </label>
        <input
          id="custom-syllables"
          value={syllables}
          onChange={(e) => setSyllables(e.target.value)}
          placeholder="5, 7, 5"
          className="w-full rounded border border-canvas-line bg-paper px-2 py-1 text-sm outline-none focus:border-indigo"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink/50" htmlFor="custom-refrains">
          Refrain lines (optional)
        </label>
        <input
          id="custom-refrains"
          value={refrains}
          onChange={(e) => setRefrains(e.target.value)}
          placeholder="line 4 repeats line 1: 4=1, 7=1"
          className="w-full rounded border border-canvas-line bg-paper px-2 py-1 text-sm outline-none focus:border-indigo"
        />
      </div>

      {error && <p className="text-xs text-berry">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs text-ink/50 hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-indigo px-3 py-1 text-xs font-medium text-paper hover:bg-indigo-soft"
        >
          Save form
        </button>
      </div>
    </div>
  )
}
