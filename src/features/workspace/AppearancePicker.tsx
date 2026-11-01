import { useLayoutEffect, useRef, useState } from 'react'
import { useSettings } from '@/engines/useSettings'
import { APPEARANCES } from './appearance'
import { Glyph } from './Glyph'

/** Native popover keeps Escape, outside dismissal, and keyboard focus familiar. */
export function AppearancePicker() {
  const { settings, updateSettings } = useSettings()
  const selected = APPEARANCES.find(
    (option) => option.value === settings.theme,
  )!
  const picker = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => {
    if (!open) return
    function position() {
      const rect = trigger.current?.getBoundingClientRect(),
        node = picker.current
      if (!rect || !node) return
      node.style.top = `${rect.bottom + 8}px`
      node.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`
      node.style.maxHeight = `${Math.max(120, window.innerHeight - rect.bottom - 20)}px`
    }
    position()
    picker.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
    window.addEventListener('resize', position)
    return () => window.removeEventListener('resize', position)
  }, [open])
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="wr-appearance"
        aria-label={`Appearance: ${selected.label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => picker.current?.togglePopover()}
      >
        <Glyph name={selected.dark ? 'moon' : 'sun'} />
        <span>{selected.label}</span>
      </button>
      <div
        ref={picker}
        popover="auto"
        role="dialog"
        aria-label="Appearance"
        className="wr-appearance-picker"
        onToggle={(event) =>
          setOpen(event.currentTarget.matches(':popover-open'))
        }
      >
        <fieldset>
          <legend>Appearance</legend>
          {APPEARANCES.map((option) => (
            <label
              key={option.value}
              className="wr-appearance-option"
              data-palette={option.value}
              onClick={(event) => {
                if (event.detail > 0)
                  requestAnimationFrame(() => {
                    picker.current?.hidePopover()
                    trigger.current?.focus()
                  })
              }}
            >
              <input
                type="radio"
                name="appearance"
                value={option.value}
                checked={settings.theme === option.value}
                onChange={() => updateSettings({ theme: option.value })}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <span className="wr-swatches" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </>
  )
}
