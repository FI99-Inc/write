import { AppHeader } from '@/features/workspace/AppHeader'
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  readBackupPreferences,
  updateBackupPreferences,
  pickBackupFolder,
  connectBackupFolder,
  runFolderBackup,
  supportsFolderBackups,
} from '@/engines/folderBackups'
import {
  exportLibrary,
  importLibrary,
  type LibraryExportData,
} from '@/db/libraryExport'
import { parseLibraryExport } from '@/db/validateLibrary'
import { downloadJson } from '@/features/library/downloadJson'
import { useModalFocus } from '@/engines/useModalFocus'

async function requireSavedBackup() {
  const result = await runFolderBackup(true)
  if (result !== 'saved')
    throw new Error(
      result === 'permission'
        ? 'Reconnect and allow folder access before backing up.'
        : 'The backup did not run. Reconnect the folder and try again.',
    )
}

export function BackupsPage() {
  const preferences = useLiveQuery(readBackupPreferences, [])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<LibraryExportData | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const importing = useRef(false)
  useModalFocus(dialog, Boolean(pending), () => {
    if (!importing.current) setPending(null)
  })
  async function perform(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError'))
        setError(
          reason instanceof Error
            ? reason.message
            : 'Could not complete this backup action.',
        )
    } finally {
      setBusy(false)
    }
  }
  function choose() {
    // Call the picker synchronously in the click event; browser activation must survive.
    const picked = pickBackupFolder()
    void perform(async () => {
      const folder = await picked
      await connectBackupFolder(folder)
      await requireSavedBackup()
      setMessage('Backup saved. Automatic backups are connected.')
    })
  }
  function reconnect() {
    const permission = preferences?.folder?.requestPermission({
      mode: 'readwrite',
    })
    void perform(async () => {
      if ((await permission) !== 'granted')
        throw new Error('Allow folder access to resume backups.')
      await updateBackupPreferences({ enabled: true, needsPermission: false })
      await requireSavedBackup()
      setMessage('Backup saved. Folder access is restored.')
    })
  }
  async function restore() {
    if (!pending || importing.current) return
    importing.current = true
    await perform(async () => {
      const result = await importLibrary(pending)
      const documentCount =
        result.poemsAdded + result.storiesAdded + result.ideasAdded
      setPending(null)
      setMessage(
        `Restored ${documentCount} document${documentCount === 1 ? '' : 's'} and ${result.projectsAdded} project${result.projectsAdded === 1 ? '' : 's'} as copies. Existing writing was kept.`,
      )
    })
    importing.current = false
  }
  const docs = pending ? [...pending.poems, ...pending.stories] : []
  return (
    <div className="min-h-full bg-canvas">
      <AppHeader />
      <header className="workspace-header">
        <h1 className="font-display text-2xl">Backups</h1>
      </header>
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-8">
        <section>
          <h2 className="font-display text-2xl">
            A separate copy of your writing
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Library backups include poems, stories, Ideas, comments, versions,
            Projects, collections, and your writing tools. Keep a copy outside
            the browser.
          </p>
          <button
            className="action-primary mt-4"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                const data = await exportLibrary()
                downloadJson(
                  data,
                  `write-library-${new Date().toISOString().slice(0, 10)}.json`,
                )
                setMessage('Library backup downloaded.')
              })
            }
          >
            Download library backup
          </button>
        </section>
        <section className="border-t border-canvas-line pt-6">
          <h2 className="font-display text-xl">Automatic folder backups</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            While WR!TE is open and visible, changed writing is backed up at
            your chosen interval. Twelve rotating copies are kept in a dedicated
            “WR!TE Backups” subfolder. Reconnecting may be needed after a
            browser restart.
          </p>
          {supportsFolderBackups() ? (
            <div className="mt-4 space-y-4">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink/50">Folder</dt>
                <dd className="break-words">
                  {preferences?.folderName || 'Not connected'}
                </dd>
                <dt className="text-ink/50">Status</dt>
                <dd>
                  {preferences?.needsPermission
                    ? 'Reconnect required'
                    : preferences?.enabled
                      ? 'Automatic backups on'
                      : 'Automatic backups off'}
                </dd>
                <dt className="text-ink/50">Last saved</dt>
                <dd>
                  {preferences?.lastBackupAt
                    ? new Date(preferences.lastBackupAt).toLocaleString()
                    : 'No folder backup yet'}
                </dd>
                {preferences?.lastFilename && (
                  <>
                    <dt className="text-ink/50">Latest file</dt>
                    <dd className="break-all text-xs">
                      {preferences.lastFilename}
                    </dd>
                  </>
                )}
              </dl>
              <label className="field-label max-w-56">
                Backup interval
                <select
                  className="field-input mt-1"
                  value={preferences?.intervalMinutes ?? 10}
                  disabled={busy}
                  onChange={(event) =>
                    void perform(() =>
                      updateBackupPreferences({
                        intervalMinutes: Number(event.target.value),
                      }),
                    )
                  }
                >
                  <option value="5">Every 5 minutes</option>
                  <option value="10">Every 10 minutes</option>
                  <option value="30">Every 30 minutes</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="action-secondary"
                  disabled={busy}
                  onClick={choose}
                >
                  {preferences?.folder
                    ? 'Choose another folder'
                    : 'Choose backup folder'}
                </button>
                {preferences?.folder && (
                  <>
                    <button
                      className="action-primary"
                      disabled={busy}
                      onClick={reconnect}
                    >
                      {preferences.needsPermission || !preferences.enabled
                        ? 'Reconnect and back up'
                        : 'Back up now'}
                    </button>
                    <button
                      className="action-secondary"
                      disabled={busy || !preferences.enabled}
                      onClick={() =>
                        void perform(() =>
                          updateBackupPreferences({
                            enabled: false,
                            error: undefined,
                          }),
                        )
                      }
                    >
                      Pause automatic backups
                    </button>
                    <button
                      className="quiet-button text-sm"
                      disabled={busy}
                      onClick={() =>
                        void perform(() =>
                          updateBackupPreferences({
                            folder: undefined,
                            enabled: false,
                            error: undefined,
                            needsPermission: false,
                          }),
                        )
                      }
                    >
                      Disconnect folder
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded border border-canvas-line bg-paper p-4 text-sm">
              This browser cannot connect a backup folder. Use Download library
              backup to keep a separate copy.
            </p>
          )}
        </section>
        <section className="border-t border-canvas-line pt-6">
          <h2 className="font-display text-xl">Restore a backup</h2>
          <p className="mt-2 mb-4 text-sm leading-relaxed text-ink/70">
            Preview a WR!TE library file before restoring. Writing is added as
            copies when IDs already exist, so your current library stays
            available.
          </p>
          <label className="field-label">
            Choose library backup
            <input
              className="field-input mt-2"
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file)
                  void perform(async () =>
                    setPending(
                      await parseLibraryExport(JSON.parse(await file.text())),
                    ),
                  )
              }}
            />
          </label>
        </section>
        {message && (
          <p role="status" className="text-sm text-verdigris">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-berry">
            {error}
          </p>
        )}
      </main>
      {pending && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 px-4">
          <div
            ref={dialog}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-preview-title"
            className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-canvas-line bg-paper p-6 shadow-lg"
          >
            <h2 id="restore-preview-title" className="font-display text-2xl">
              Backup preview
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              Exported {new Date(pending.exportedAt).toLocaleString()}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt>Documents</dt>
              <dd>{docs.length}</dd>
              <dt>In Trash</dt>
              <dd>{docs.filter((doc) => doc.deletedAt).length}</dd>
              <dt>Saved versions</dt>
              <dd>{pending.snapshots.length}</dd>
              <dt>Projects</dt>
              <dd>{pending.projects?.length ?? 0}</dd>
              <dt>Collections</dt>
              <dd>{pending.collections.length}</dd>
            </dl>
            <ul className="mt-4 max-h-48 overflow-y-auto border-y border-canvas-line py-2 text-sm">
              {docs.slice(0, 30).map((doc) => (
                <li key={doc.id} className="py-1">
                  {doc.title || 'Untitled'}
                  {doc.deletedAt ? ' (in Trash)' : ''}
                </li>
              ))}
              {docs.length > 30 && (
                <li className="py-1 text-ink/50">
                  And {docs.length - 30} more documents
                </li>
              )}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-ink/60">
              Existing writing stays unchanged. Restored Projects and versions
              follow their restored documents. Folder permissions stay on this
              computer.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-berry">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="action-primary"
                disabled={busy}
                onClick={() => void restore()}
              >
                {busy ? 'Restoring…' : 'Restore as copies'}
              </button>
              <button
                className="action-secondary"
                disabled={busy}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
