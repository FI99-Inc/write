import { describe, expect, it, vi } from 'vitest'
import {
  createBackupRunner,
  DEFAULT_BACKUPS,
  type BackupFolder,
  type BackupPreferences,
} from '@/engines/folderBackups'
import type { LibraryExportData } from '@/db/libraryExport'

function setup() {
  const write = vi.fn(async () => {}),
    close = vi.fn(async () => {}),
    abort = vi.fn(async () => {})
  const getFileHandle = vi.fn(async (_name: string, _options: { create: boolean }) => ({
    createWritable: async () => ({ write, close, abort }),
  }))
  const folder: BackupFolder = {
    name: 'Test',
    queryPermission: vi.fn(async () => 'granted' as PermissionState),
    requestPermission: vi.fn(async () => 'granted' as PermissionState),
    getDirectoryHandle: vi.fn(async () => folder),
    getFileHandle,
  }
  let preferences: BackupPreferences = { ...DEFAULT_BACKUPS, enabled: true, folder, setId: 'test' }
  let now = 1000000
  const library = vi.fn(async (): Promise<LibraryExportData> => ({
    version: 3,
    exportedAt: now,
    poems: [],
    stories: [],
    snapshots: [],
    collections: [],
    customForms: [],
    wordOverrides: [],
    projects: [],
  }))
  const run = createBackupRunner({
    read: async () => preferences,
    update: async (changes) => {
      preferences = { ...preferences, ...changes }
    },
    library,
    now: () => now,
    digest: async (text) => text,
  })
  return {
    run,
    write,
    close,
    abort,
    getFileHandle,
    folder,
    library,
    prefs: () => preferences,
    advance: () => {
      now += 600001
    },
  }
}
describe('chosen-folder backups', () => {
  it('commits only after close, serializes requests, and skips unchanged writing', async () => {
    const test = setup()
    const first = test.run(true),
      second = test.run(true)
    expect(first).toBe(second)
    await first
    expect(test.close).toHaveBeenCalledOnce()
    expect(test.prefs().lastBackupAt).toBe(1000000)
    test.advance()
    expect(await test.run()).toBe('unchanged')
    expect(test.write).toHaveBeenCalledOnce()
  })
  it('preserves the last successful timestamp and slot when a write fails', async () => {
    const test = setup()
    await test.run(true)
    test.advance()
    test.close.mockRejectedValueOnce(new Error('disk full'))
    await expect(test.run(true)).rejects.toThrow('disk space')
    expect(test.prefs().lastBackupAt).toBe(1000000)
    expect(test.prefs().nextSlot).toBe(1)
    expect(test.abort).toHaveBeenCalledOnce()
    expect(test.prefs().error).toBeTruthy()
  })
  it('never requests permissions from the automatic scheduler', async () => {
    const test = setup()
    vi.mocked(test.folder.queryPermission).mockResolvedValue('prompt')
    expect(await test.run()).toBe('permission')
    expect(test.folder.requestPermission).not.toHaveBeenCalled()
    expect(test.write).not.toHaveBeenCalled()
    expect(test.prefs().needsPermission).toBe(true)
  })
  it('rotates only its twelve app-owned names', async () => {
    const test = setup()
    for (let index = 0; index < 13; index++) await test.run(true)
    const names = test.getFileHandle.mock.calls.map((call) => call[0])
    expect(new Set(names).size).toBe(12)
    expect(names[0]).toBe('write-test-01.json')
    expect(names[12]).toBe(names[0])
  })
})
