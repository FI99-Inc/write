import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/db/schema'
import {
  countByStatus,
  countByForm,
  totalWords,
  mostUsedWords,
  collectActivityTimestamps,
  computeActivityHeatmap,
  currentStreak,
} from '@/engines/stats'
import { BUILT_IN_TEMPLATES_BY_ID } from '@/engines/formTemplates/index'
import { POEM_STATUSES } from '@/types/poem'
import { ActivityHeatmap } from '@/features/stats/ActivityHeatmap'

export function StatsPage() {
  const poems = useLiveQuery(() => db.poems.toArray(), [])
  const snapshots = useLiveQuery(() => db.snapshots.toArray(), [])
  const customForms = useLiveQuery(() => db.customForms.toArray(), []) ?? []

  const stats = useMemo(() => {
    if (!poems || !snapshots) return null
    const heatmap = computeActivityHeatmap(collectActivityTimestamps(poems, snapshots))
    return {
      byStatus: countByStatus(poems),
      byForm: countByForm(poems),
      totalWords: totalWords(poems),
      topWords: mostUsedWords(poems, 20),
      heatmap,
      streak: currentStreak(heatmap),
    }
  }, [poems, snapshots])

  function formName(formId: string): string {
    if (formId === 'none') return 'No form'
    return BUILT_IN_TEMPLATES_BY_ID[formId]?.name ?? customForms.find((f) => f.id === formId)?.name ?? formId
  }

  return (
    <div className="min-h-full bg-canvas">
      <header className="flex items-center gap-4 border-b border-canvas-line px-4 py-4 sm:gap-5 sm:px-8 sm:py-6">
        <Link to="/" className="text-sm text-ink/50 hover:text-indigo">
          ← Library
        </Link>
        <h1 className="font-display text-xl tracking-tight text-ink sm:text-2xl">Stats</h1>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:space-y-10 sm:px-8 sm:py-10">
        {!stats ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : (
          <>
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">Writing streak</p>
              <p className="mb-3 font-display text-3xl text-ink">
                {stats.streak} day{stats.streak === 1 ? '' : 's'}
              </p>
              <ActivityHeatmap heatmap={stats.heatmap} />
            </section>

            <section className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Total words</p>
                <p className="font-display text-2xl text-ink">{stats.totalWords.toLocaleString()}</p>
              </div>
              {POEM_STATUSES.map((status) => (
                <div key={status}>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/40">{status}</p>
                  <p className="font-display text-2xl text-ink">{stats.byStatus[status]}</p>
                </div>
              ))}
            </section>

            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">By form</p>
              <ul className="space-y-1 text-sm">
                {Array.from(stats.byForm.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([formId, count]) => (
                    <li key={formId} className="flex justify-between text-ink/70">
                      <span>{formName(formId)}</span>
                      <span className="text-ink/40">{count}</span>
                    </li>
                  ))}
              </ul>
            </section>

            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">
                Most-used words (stopwords excluded)
              </p>
              {stats.topWords.length === 0 ? (
                <p className="text-sm text-ink/40">Write a bit more to see your most-used words.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.topWords.map(({ word, count }) => (
                    <span
                      key={word}
                      className="rounded-full border border-canvas-line bg-paper px-3 py-1 text-sm text-ink/70"
                    >
                      {word} <span className="text-ink/40">×{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
