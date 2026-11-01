import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDictionary } from '@/engines/useDictionary'
import { validateForm } from '@/engines/formValidation'
import { validateSestina } from '@/engines/sestina'
import { BUILT_IN_TEMPLATES } from '@/engines/formTemplates/index'
import { listCustomForms } from '@/db/customForms'
import { ChecklistView } from '@/features/editor/workbench/form/ChecklistView'
import { RefrainTracker } from '@/features/editor/workbench/form/RefrainTracker'
import { SestinaPlanner } from '@/features/editor/workbench/form/SestinaPlanner'
import { AcrosticGuide } from '@/features/editor/workbench/form/AcrosticGuide'
import { CustomFormBuilder } from '@/features/editor/workbench/form/CustomFormBuilder'

import type { FormTemplate } from '@/types/form'
const EMPTY_FORMS: FormTemplate[] = []

interface FormTabProps {
  body: string
  formId: string | null
  acrosticWord: string
  onFormChange: (formId: string | null) => void
  onAcrosticWordChange: (word: string) => void
  onInsert: (text: string) => void
}

export function FormTab({
  body,
  formId,
  acrosticWord,
  onFormChange,
  onAcrosticWordChange,
  onInsert,
}: FormTabProps) {
  const { dict, overrides } = useDictionary()
  const customForms = useLiveQuery(() => listCustomForms(), []) ?? EMPTY_FORMS
  const [strictMode, setStrictMode] = useState(false)
  const [builder, setBuilder] = useState({ formId, open: false })
  if (builder.formId !== formId) setBuilder({ formId, open: false })
  const showBuilder = builder.formId === formId && builder.open
  const setShowBuilder = (open: boolean) => setBuilder({ formId, open })

  const allTemplates = useMemo(() => [...BUILT_IN_TEMPLATES, ...customForms], [customForms])
  const template = allTemplates.find((t) => t.id === formId) ?? null

  const items = useMemo(() => {
    if (!template || !dict) return []
    if (template.isSestina) return validateSestina(body)
    if (template.isAcrostic) return [] // AcrosticGuide renders its own checklist
    return validateForm(body, template, dict, overrides)
  }, [template, body, dict, overrides])

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink/40" htmlFor="form-select">
          Form
        </label>
        <select
          id="form-select"
          value={formId ?? ''}
          onChange={(event) => onFormChange(event.target.value || null)}
          className="w-full rounded border border-canvas-line bg-canvas px-2 py-1.5 text-sm outline-none focus:border-indigo"
        >
          <option value="">No form (untracked)</option>
          <optgroup label="Built-in forms">
            {BUILT_IN_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
          {customForms.length > 0 && (
            <optgroup label="Custom forms">
              {customForms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {!showBuilder ? (
        <button
          type="button"
          onClick={() => setShowBuilder(true)}
          className="text-xs text-indigo hover:underline"
        >
          + Build a custom form
        </button>
      ) : (
        <CustomFormBuilder
          onCancel={() => setShowBuilder(false)}
          onSaved={(saved) => {
            setShowBuilder(false)
            onFormChange(saved.id)
          }}
        />
      )}

      {template && (
        <>
          <div className="rounded border border-canvas-line bg-canvas p-3">
            <p className="text-sm font-medium text-ink">{template.name}</p>
            <p className="mt-1 text-xs text-ink/50">{template.description}</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink/50">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(event) => setStrictMode(event.target.checked)}
            />
            Strict Mode — flag every deviation prominently
          </label>

          {template.isAcrostic ? (
            <AcrosticGuide
              body={body}
              word={acrosticWord}
              strictMode={strictMode}
              onWordChange={onAcrosticWordChange}
            />
          ) : template.isSestina ? (
            <SestinaPlanner body={body} strictMode={strictMode} />
          ) : (
            <>
              <ChecklistView items={items} strictMode={strictMode} />
              <RefrainTracker template={template} body={body} onInsert={onInsert} />
            </>
          )}
        </>
      )}
    </div>
  )
}
