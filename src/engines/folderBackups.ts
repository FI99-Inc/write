import { db } from '@/db/schema'
import { exportLibrary } from '@/db/libraryExport'

export interface BackupFolder {
  name: string
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<BackupFolder>
  getFileHandle(
    name: string,
    options: { create: boolean },
  ): Promise<{
    createWritable(): Promise<{
      write(data: string): Promise<void>
      close(): Promise<void>
      abort(): Promise<void>
    }>
  }>
}
export interface BackupPreferences {
  enabled: boolean
  folder?: BackupFolder
  folderName?: string
  setId: string
  intervalMinutes: number
  nextSlot: number
  lastBackupAt?: number
  lastCheckedAt?: number
  lastFilename?: string
  fingerprint?: string
  error?: string
  needsPermission?: boolean
}
export const DEFAULT_BACKUPS: BackupPreferences = {
  enabled: false,
  setId: '',
  intervalMinutes: 10,
  nextSlot: 0,
}
export async function readBackupPreferences(): Promise<BackupPreferences> {
  const row = await db.backupPreferences.get('folder')
  return { ...DEFAULT_BACKUPS, ...(row?.value as Partial<BackupPreferences> | undefined) }
}
export async function updateBackupPreferences(
  changes: Partial<BackupPreferences>,
  expectedSetId?: string,
): Promise<void> {
  await db.transaction('rw', db.backupPreferences, async () => {
    const current = await readBackupPreferences()
    if (expectedSetId !== undefined && current.setId !== expectedSetId) return
    await db.backupPreferences.put({ id: 'folder', value: { ...current, ...changes } })
  })
}
export function supportsFolderBackups(): boolean {
  return (
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      'function' && typeof navigator.locks?.request === 'function'
  )
}
export function pickBackupFolder(): Promise<BackupFolder> {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (options: { mode: 'readwrite'; id: string }) => Promise<BackupFolder>
    }
  ).showDirectoryPicker
  if (!picker)
    return Promise.reject(
      new Error(
        'Folder backups are unavailable in this browser. Download a library backup instead.',
      ),
    )
  return picker.call(window, { mode: 'readwrite', id: 'write-library-backups' })
}
export async function connectBackupFolder(folder: BackupFolder): Promise<void> {
  await updateBackupPreferences({
    folder,
    folderName: folder.name,
    setId: crypto.randomUUID(),
    enabled: true,
    nextSlot: 0,
    fingerprint: undefined,
    lastCheckedAt: undefined,
    lastBackupAt: undefined,
    lastFilename: undefined,
    error: undefined,
    needsPermission: false,
  })
}

interface BackupDependencies {
  read: () => Promise<BackupPreferences>
  update: (changes: Partial<BackupPreferences>, expectedSetId?: string) => Promise<void>
  library: typeof exportLibrary
  now: () => number
  digest: (text: string) => Promise<string>
}
/** Serialized, atomic file commits. Only twelve app-owned slots in a dedicated subfolder are touched. */
export function createBackupRunner(dependencies: BackupDependencies) {
  let running: Promise<'saved' | 'unchanged' | 'paused' | 'permission'> | null = null
  return function run(force = false): Promise<'saved' | 'unchanged' | 'paused' | 'permission'> {
    if (running) return running
    running = (async () => {
      const preferences = await dependencies.read()
      const now = dependencies.now()
      if (
        !preferences.enabled ||
        !preferences.folder ||
        (!force &&
          preferences.lastCheckedAt &&
          now - preferences.lastCheckedAt < preferences.intervalMinutes * 60_000)
      )
        return 'paused'
      try {
        if ((await preferences.folder.queryPermission({ mode: 'readwrite' })) !== 'granted') {
          await dependencies.update(
            {
              needsPermission: true,
              error: 'Reconnect your backup folder to resume automatic backups.',
            },
            preferences.setId,
          )
          return 'permission'
        }
        const data = await dependencies.library()
        const fingerprint = await dependencies.digest(JSON.stringify({ ...data, exportedAt: 0 }))
        if (!force && preferences.fingerprint === fingerprint) {
          await dependencies.update(
            {
              lastCheckedAt: now,
              error: undefined,
              needsPermission: false,
            },
            preferences.setId,
          )
          return 'unchanged'
        }
        const directory = await preferences.folder.getDirectoryHandle('WR!TE Backups', {
          create: true,
        })
        const slot = preferences.nextSlot % 12
        const filename = `write-${preferences.setId}-${String(slot + 1).padStart(2, '0')}.json`
        const file = await directory.getFileHandle(filename, { create: true })
        const stream = await file.createWritable()
        try {
          await stream.write(JSON.stringify(data, null, 2))
          await stream.close()
        } catch (reason) {
          try {
            await stream.abort()
          } catch {
            /* The original file remains authoritative. */
          }
          throw reason
        }
        // A disconnected or replaced folder must not be re-enabled by an in-flight completion.
        await dependencies.update(
          {
            lastBackupAt: dependencies.now(),
            lastCheckedAt: now,
            lastFilename: filename,
            fingerprint,
            nextSlot: (slot + 1) % 12,
            error: undefined,
            needsPermission: false,
          },
          preferences.setId,
        )
        return 'saved'
      } catch (reason) {
        const message =
          reason instanceof DOMException &&
          ['NotAllowedError', 'SecurityError'].includes(reason.name)
            ? 'Folder access was denied. Reconnect the folder to try again.'
            : 'The backup could not be written. Check the folder and available disk space, then try again.'
        if ((await dependencies.read()).setId === preferences.setId)
          await dependencies.update(
            {
              error: message,
              lastCheckedAt: now,
              needsPermission: reason instanceof DOMException && reason.name === 'NotAllowedError',
            },
            preferences.setId,
          )
        throw new Error(message)
      }
    })().finally(() => {
      running = null
    })
    return running
  }
}
const backupRunner = createBackupRunner({
  read: readBackupPreferences,
  update: updateBackupPreferences,
  library: exportLibrary,
  now: Date.now,
  digest: async (text) => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  },
})

/** One origin-wide lock covers the entire read/export/write/metadata commit across tabs. */
export async function runFolderBackup(force = false) {
  if (!navigator.locks?.request) return 'paused' as const
  return navigator.locks.request('write-library-folder-backup', () => backupRunner(force))
}
