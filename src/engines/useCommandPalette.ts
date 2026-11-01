import { createContext, useContext, useEffect } from 'react'

export interface Command {
  id: string
  label: string
  shortcut?: string
  run: () => void
}

export interface RegistryActions {
  registerCommands: (scopeId: string, commands: Command[]) => void
  unregisterCommands: (scopeId: string) => void
}

export interface PaletteState {
  open: boolean
  setOpen: (open: boolean) => void
  commands: Command[]
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
}

// Split into two contexts so that pages registering commands (which only
// need the stable registerCommands/unregisterCommands functions) don't
// re-render every time the palette's open state or command list changes —
// only the palette UI itself needs PaletteStateContext.
export const RegistryActionsContext = createContext<RegistryActions>({
  registerCommands: () => {},
  unregisterCommands: () => {},
})

export const PaletteStateContext = createContext<PaletteState>({
  open: false,
  setOpen: () => {},
  commands: [],
  shortcutsOpen: false,
  setShortcutsOpen: () => {},
})

export function useCommandPaletteState(): PaletteState {
  return useContext(PaletteStateContext)
}

/** Registers a scoped set of commands (e.g. one page's toolbar actions) into
 * the global command palette for as long as the calling component stays
 * mounted, replacing that scope's commands whenever the array reference
 * changes. Pass a memoized `commands` array where practical — an
 * unmemoized inline array still works, it just re-registers every render. */
export function useRegisterCommands(scopeId: string, commands: Command[]): void {
  const { registerCommands, unregisterCommands } = useContext(RegistryActionsContext)
  useEffect(() => {
    registerCommands(scopeId, commands)
  }, [scopeId, commands, registerCommands])
  useEffect(() => () => unregisterCommands(scopeId), [scopeId, unregisterCommands])
}
