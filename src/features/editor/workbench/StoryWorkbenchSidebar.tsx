import { useRecentWords } from '@/engines/useRecentWords'
import { useMemo, useState } from 'react'
import { DictionaryProvider } from '@/engines/DictionaryContext'
import { ThesaurusTab } from '@/features/editor/workbench/ThesaurusTab'
import { SparkTab } from '@/features/editor/workbench/SparkTab'
import { AskAiTab } from '@/features/editor/workbench/AskAiTab'
import { RecentLookupsTab } from '@/features/editor/workbench/RecentLookupsTab'
import { CommentsTab, type CommentsTabProps } from '@/features/editor/workbench/CommentsTab'
import { WorkbenchPanel } from '@/features/editor/workbench/WorkbenchPanel'

const TABS = [
  { id: 'thesaurus', label: 'Thesaurus' },
  { id: 'recent', label: 'Recent' },
  { id: 'spark', label: 'Spark' },
  { id: 'ai', label: 'Ask AI' },
  { id: 'comments', label: 'Comments' },
] as const

type TabId = (typeof TABS)[number]['id']

interface StoryWorkbenchSidebarProps {
  activeWord: string | null
  body: string
  onInsert: (word: string) => void
  /** Collapsed/focus mode keeps the sidebar mounted but visually hidden, so
   * the Ask AI conversation survives being toggled off and back on. */
  hidden?: boolean
  onClose: () => void
  /** Only provided for rich stories — plain stories have no comment threads.
   * Optional so nothing breaks where the sidebar is used without it. */
  commentsProps?: CommentsTabProps
}

/** The poem workbench's Rhymes/Syllables/Sound/Meter/Form tabs don't apply
 * to prose — this is the same word-lookup + writing-aid tooling (Thesaurus,
 * Spark, Ask AI), reused as-is, without the poetry-analysis tabs. */
export function StoryWorkbenchSidebar({
  activeWord,
  body,
  onInsert,
  hidden,
  onClose,
  commentsProps,
}: StoryWorkbenchSidebarProps) {
  const [choice, setChoice] = useState<{ id: TabId; request?: number }>({ id: 'thesaurus' })
  const recent = useRecentWords(activeWord)
  const activeCommentId = commentsProps?.activeCommentId
  const focusRequest = commentsProps?.focusRequest
  const tab = activeCommentId && choice.request !== focusRequest ? 'comments' : choice.id

  const word = activeWord ?? ''

  // Plain stories have no comment threads (commentsProps is undefined) — hide
  // the tab entirely rather than showing a button that opens to nothing.
  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.id !== 'comments' || commentsProps),
    [commentsProps],
  )

  return (
    <WorkbenchPanel
      tabs={visibleTabs}
      activeTab={tab}
      onTabChange={(id) => setChoice({ id: id as TabId, request: focusRequest })}
      hidden={hidden}
      onClose={onClose}
    >
      {!hidden && tab === 'thesaurus' && <ThesaurusTab word={word} onInsert={onInsert} />}
      {tab === 'recent' && <RecentLookupsTab words={recent} onSelect={onInsert} />}
      {!hidden && tab === 'spark' && (
        <DictionaryProvider>
          <SparkTab onInsert={onInsert} />
        </DictionaryProvider>
      )}
      {/* Ask AI stays mounted (just hidden) so switching tabs — or collapsing
       * the whole panel — never throws away the conversation in progress. */}
      <div className={tab === 'ai' ? 'h-full' : 'hidden'}>
        <AskAiTab body={body} />
      </div>
      {tab === 'comments' && commentsProps && <CommentsTab {...commentsProps} />}
    </WorkbenchPanel>
  )
}
