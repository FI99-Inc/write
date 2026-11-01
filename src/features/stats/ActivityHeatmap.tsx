import { toDateKey } from '@/engines/stats'

interface ActivityHeatmapProps {
  heatmap: Map<string, number>
  weeks?: number
  today: Date
}

function intensityClass(count: number): string {
  if (count === 0) return 'bg-canvas-line'
  if (count <= 1) return 'bg-indigo/25'
  if (count <= 3) return 'bg-indigo/50'
  if (count <= 6) return 'bg-indigo/75'
  return 'bg-indigo'
}

export function ActivityHeatmap({ heatmap, weeks = 12, today }: ActivityHeatmapProps) {
  const totalDays = weeks * 7
  const days: { key: string; count: number }[] = []

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = toDateKey(d.getTime())
    days.push({ key, count: heatmap.get(key) ?? 0 })
  }

  const columns: { key: string; count: number }[][] = []
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7))
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-1">
          {column.map((day) => (
            <div
              key={day.key}
              title={`${day.key}: ${day.count} activity event${day.count === 1 ? '' : 's'}`}
              className={`h-3 w-3 rounded-sm ${intensityClass(day.count)}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
