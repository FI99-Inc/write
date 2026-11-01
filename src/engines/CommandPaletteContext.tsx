import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  PaletteStateContext,
  RegistryActionsContext,
  type Command,
  type PaletteState,
} from '@/engines/useCommandPalette'

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [registry, setRegistry] = useState<Map<string, Command[]>>(new Map())

  const registerCommands = useCallback((scopeId: string, commands: Command[]) => {
    setRegistry((prev) => {
      const next = new Map(prev)
      next.set(scopeId, commands)
      return next
    })
  }, [])

  const unregisterCommands = useCallback((scopeId: string) => {
    setRegistry((prev) => {
      if (!prev.has(scopeId)) return prev
      const next = new Map(prev)
      next.delete(scopeId)
      return next
    })
  }, [])

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const actions = useMemo(
    () => ({ registerCommands, unregisterCommands }),
    [registerCommands, unregisterCommands],
  )
  const commands = useMemo(() => Array.from(registry.values()).flat(), [registry])
  const state = useMemo<PaletteState>(
    () => ({ open, setOpen, commands, shortcutsOpen, setShortcutsOpen }),
    [open, commands, shortcutsOpen],
  )

  return (
    <RegistryActionsContext.Provider value={actions}>
      <PaletteStateContext.Provider value={state}>{children}</PaletteStateContext.Provider>
    </RegistryActionsContext.Provider>
  )
}
