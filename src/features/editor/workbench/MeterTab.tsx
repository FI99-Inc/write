import { useMemo } from 'react'
import { useDictionary } from '@/engines/useDictionary'
import { analyzePoemMeter } from '@/engines/meterReport'

interface MeterTabProps {
  body: string
}

export function MeterTab({ body }: MeterTabProps) {
  const { dict, overrides } = useDictionary()

  const report = useMemo(
    () => (dict ? analyzePoemMeter(body, dict, overrides) : null),
    [body, dict, overrides],
  )

  if (!dict || !report) return <p className="text-sm text-ink/40">Loading dictionary…</p>

  const nonBlankLines = report.lines.filter((l) => l.detection !== null)

  if (nonBlankLines.length === 0) {
    return <p className="text-sm text-ink/40">Write a line or two to see a meter report.</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-xs font-medium text-ink/40">Dominant meter</p>
        <p className="text-sm text-ink">{report.dominantMeter ?? '—'}</p>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-ink/40">Per-line detection</p>
        <ul className="space-y-1.5">
          {report.lines.map((line) => (
            <li key={line.lineIndex} className="flex items-center justify-between text-sm">
              <span className="text-ink/50">Line {line.lineIndex + 1}</span>
              {line.detection ? (
                <span className="flex items-center gap-2">
                  {line.openingInversion && (
                    <span
                      className="text-xs text-berry"
                      title="Opening trochaic inversion: first foot reversed"
                    >
                      ⤺ inversion
                    </span>
                  )}
                  <span className={line.detection.confidence < 0.8 ? 'text-berry' : 'text-ink'}>
                    {line.detection.name}
                  </span>
                  <span className="text-xs text-ink/35">
                    {Math.round(line.detection.confidence * 100)}%
                  </span>
                </span>
              ) : (
                <span className="text-ink/30">—</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {report.irregularLines.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-ink/40">Worth a second look</p>
          <p className="text-sm text-ink/60">
            Line{report.irregularLines.length === 1 ? '' : 's'}{' '}
            {report.irregularLines.map((i) => i + 1).join(', ')}{' '}
            {report.irregularLines.length === 1 ? 'deviates' : 'deviate'} substantially from any
            regular meter.
          </p>
        </div>
      )}
    </div>
  )
}
