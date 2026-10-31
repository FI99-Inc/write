import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { readBackupPreferences, runFolderBackup } from '@/engines/folderBackups'

export function BackupScheduler() {
  const preferences = useLiveQuery(readBackupPreferences, [])
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible')
        void runFolderBackup().catch(() => {
          /* The stored error is shown in the notice and backup screen. */
        })
    }
    tick()
    const timer = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  if (!preferences?.enabled || !preferences.error) return null
  return (
    <p role="status" className="border-b border-canvas-line bg-paper px-4 py-2 text-sm text-berry">
      {preferences.error}{' '}
      <Link className="underline" to="/backups">
        Open backups
      </Link>
    </p>
  )
}
