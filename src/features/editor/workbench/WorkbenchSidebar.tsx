import { useRecentWords } from '@/engines/useRecentWords'
import { useState } from 'react'
import { RhymesTab } from '@/features/editor/workbench/RhymesTab'
import { ThesaurusTab } from '@/features/editor/workbench/ThesaurusTab'
import { SyllablesStressTab } from '@/features/editor/workbench/SyllablesStressTab'
import { SoundToolsTab } from '@/features/editor/workbench/SoundToolsTab'
import { MeterTab } from '@/features/editor/workbench/MeterTab'
import { FormTab } from '@/features/editor/workbench/form/FormTab'
import { RecentLookupsTab } from '@/features/editor/workbench/RecentLookupsTab'
import { SparkTab } from '@/features/editor/workbench/SparkTab'
import { AskAiTab } from '@/features/editor/workbench/AskAiTab'
import { WorkbenchPanel } from '@/features/editor/workbench/WorkbenchPanel'

const TABS = [
  { id: 'rhymes', label: 'Rhymes' },
  { id: 'thesaurus', label: 'Thesaurus' },
  { id: 'syllables', label: 'Syllables' },
  { id: 'sound', label: 'Sound' },
  { id: 'meter', label: 'Meter' },
  { id: 'form', label: 'Form' },
  { id: 'recent', label: 'Recent' },
  { id: 'spark', label: 'Spark' },
  { id: 'ai', label: 'Ask AI' },
] as const

type TabId = (typeof TABS)[number]['id']

interface WorkbenchSidebarProps {
  activeWord: string | null
  poemWords: Set<string>
  body: string
  formId: string | null
  acrosticWord: string
  onFormChange: (formId: string | null) => void
  onAcrosticWordChange: (word: string) => void
  onInsert: (word: string) => void
  /** Collapsed/focus mode keeps the sidebar mounted but visually hidden, so
   * the Ask AI conversation survives being toggled off and back on. */
  hidden?: boolean
  onClose: () => void
}

export function WorkbenchSidebar({
  activeWord,
  poemWords,
  body,
  formId,
  acrosticWord,
  onFormChange,
  onAcrosticWordChange,
  onInsert,
  hidden,
  onClose,
}: WorkbenchSidebarProps) {
  const [tab, setTab] = useState<TabId>('rhymes')
  const recent = useRecentWords(activeWord)

  const word = activeWord ?? ''

  return (
    <WorkbenchPanel
      tabs={TABS}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      hidden={hidden}
      onClose={onClose}
    >
      {!hidden && tab === 'rhymes' && <RhymesTab word={word} onInsert={onInsert} />}
      {!hidden && tab === 'thesaurus' && <ThesaurusTab word={word} onInsert={onInsert} />}
      {!hidden && tab === 'syllables' && <SyllablesStressTab />}
      {!hidden && tab === 'sound' && (
        <SoundToolsTab word={word} poemWords={poemWords} onInsert={onInsert} />
      )}
      {!hidden && tab === 'meter' && <MeterTab body={body} />}
      {!hidden && tab === 'form' && (
        <FormTab
          body={body}
          formId={formId}
          acrosticWord={acrosticWord}
          onFormChange={onFormChange}
          onAcrosticWordChange={onAcrosticWordChange}
          onInsert={onInsert}
        />
      )}
      {tab === 'recent' && <RecentLookupsTab words={recent} onSelect={onInsert} />}
      {!hidden && tab === 'spark' && <SparkTab onInsert={onInsert} />}
      {/* Ask AI stays mounted (just hidden) so switching tabs — or collapsing
       * the whole panel — never throws away the conversation in progress. */}
      <div className={tab === 'ai' ? 'h-full' : 'hidden'}>
        <AskAiTab body={body} />
      </div>
    </WorkbenchPanel>
  )
}
