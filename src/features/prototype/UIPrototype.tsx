/* Five app-wide UI directions, switchable via ?variant=A–E at /prototype/ui.
 * Throwaway, development-only, in-memory demo. The whole-shell question spans
 * Library, Editor, and Project navigation; no writing/database services mount.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { BrowserRouter, useSearchParams } from 'react-router-dom'
import {
  directions,
  initialDocs,
  wordCount,
  plural,
  kindName,
  type DemoDoc,
  type Direction,
  type Kind,
  type Screen,
} from './demoData'
import './prototype.css'
import { MarginWorkspace } from './MarginWorkspace'

type IconName =
  | 'library'
  | 'write'
  | 'project'
  | 'search'
  | 'plus'
  | 'settings'
  | 'arrow'
  | 'back'
  | 'down'
  | 'star'
  | 'history'
  | 'close'
  | 'tools'
  | 'menu'
  | 'grid'
  | 'check'
  | 'export'
  | 'note'
function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    library: (
      <>
        <path d="M4 4h4v16H4zm7 0h4v16h-4zm7 1 3 14" />
      </>
    ),
    write: (
      <>
        <path d="m5 16-1 4 4-1L20 7l-3-3zM14 7l3 3" />
      </>
    ),
    project: (
      <>
        <path d="M3 6h7l2 2h9v12H3zM3 6V4h7l2 2h9v2" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    settings: (
      <>
        <path d="M3 6h4m6 0h8M3 12h9m6 0h3M3 18h4m6 0h8" />
        <circle cx="10" cy="6" r="3" />
        <circle cx="15" cy="12" r="3" />
        <circle cx="10" cy="18" r="3" />
      </>
    ),
    arrow: <path d="m9 5 7 7-7 7" />,
    back: <path d="m15 5-7 7 7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    star: <path d="m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z" />,
    history: (
      <>
        <path d="M4 7v5h5M4 12a8 8 0 1 0 2-6" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    tools: (
      <>
        <path d="m4 20 9-9M14 4a5 5 0 0 0 6 6l-3 3-6-6z" />
        <path d="m4 4 16 16" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    export: (
      <>
        <path d="M12 16V3m-4 4 4-4 4 4M4 14v6h16v-6" />
      </>
    ),
    note: (
      <>
        <path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export interface UI {
  variant: Direction
  screen: Screen
  docs: DemoDoc[]
  doc: DemoDoc
  filtered: DemoDoc[]
  kind: 'all' | Kind
  query: string
  tools: boolean
  focus: boolean
  toolTab: string
  project: DemoDoc[]
  words: number
  notes: string[]
  go: (screen: Screen) => void
  open: (id: string) => void
  select: (id: string) => void
  create: (kind: Kind) => void
  filter: (kind: 'all' | Kind) => void
  search: (value: string) => void
  toggleTools: () => void
  toggleFocus: () => void
  setToolTab: (tab: string) => void
  update: (changes: Partial<DemoDoc>) => void
  count: (words: number) => void
  move: (id: string, delta: number) => void
  menu: (menu: string) => void
  notify: (text: string) => void
  addNote: (text: string) => void
}
function Brand({ subtle = false }: { subtle?: boolean }) {
  return <span className={`brand ${subtle ? 'brand-subtle' : ''}`}>WR!TE</span>
}
function Button({
  children,
  onClick,
  primary = false,
  className = '',
  title,
}: {
  children: ReactNode
  onClick: () => void
  primary?: boolean
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${primary ? 'primary' : 'button'} ${className}`}
    >
      {children}
    </button>
  )
}
function Nav({ ui, rail = false }: { ui: UI; rail?: boolean }) {
  return (
    <nav className={rail ? 'rail-nav' : 'main-nav'} aria-label="Main navigation">
      {(
        [
          ['library', 'library', 'Library'],
          ['editor', 'write', 'Writing'],
          ['project', 'project', 'Projects'],
        ] as const
      ).map(([screen, icon, label]) => (
        <button
          key={screen}
          onClick={() => ui.go(screen)}
          aria-current={ui.screen === screen ? 'page' : undefined}
          className={ui.screen === screen ? 'active' : ''}
        >
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
function KindTabs({ ui }: { ui: UI }) {
  return (
    <div className="kind-tabs" aria-label="Document type">
      {(['all', 'poem', 'story', 'idea'] as const).map((kind) => (
        <button key={kind} aria-pressed={ui.kind === kind} onClick={() => ui.filter(kind)}>
          {kind === 'all' ? 'All writing' : plural(kind)}
        </button>
      ))}
    </div>
  )
}
function Search({ ui, placeholder = 'Find your writing' }: { ui: UI; placeholder?: string }) {
  return (
    <label className="search">
      <Icon name="search" />
      <input
        aria-label="Search demo writing"
        value={ui.query}
        onChange={(event) => ui.search(event.target.value)}
        placeholder={placeholder}
      />
      <kbd>Ctrl K</kbd>
    </label>
  )
}
function Status({ value }: { value: DemoDoc['status'] }) {
  return <span className={`doc-status status-${value.toLowerCase()}`}>{value}</span>
}
function Type({ kind }: { kind: Kind }) {
  return <span className={`doc-type type-${kind}`}>{kindName(kind)}</span>
}
function Title({ ui }: { ui: UI }) {
  return (
    <input
      className="writing-title"
      aria-label="Document title"
      value={ui.doc.title}
      onChange={(event) => ui.update({ title: event.target.value })}
    />
  )
}
function Writing({ ui, numbers = false }: { ui: UI; numbers?: boolean }) {
  const isPoem = ui.doc.kind === 'poem'
  const surface = useRef<HTMLDivElement>(null)
  const id = ui.doc.id,
    body = ui.doc.body
  // Let the browser own the editable DOM. Preview state updates must not
  // reconcile React children over text the person has just typed.
  useLayoutEffect(() => {
    const node = surface.current
    if (!node || document.activeElement === node) return
    const fragments = isPoem ? body.split('\n') : body.split('\n\n')
    node.replaceChildren(
      ...fragments.map((text, index) => {
        const paragraph = document.createElement('p')
        paragraph.dataset.count = text ? String(index % 5 === 0 ? 10 : 11) : ''
        if (text) paragraph.textContent = text
        else paragraph.append(document.createElement('br'))
        return paragraph
      }),
    )
  }, [id, body, isPoem])
  return (
    <div
      ref={surface}
      className={`writing-body ${isPoem ? 'is-poem' : 'is-prose'} ${numbers ? 'with-counts' : ''}`}
      contentEditable
      suppressContentEditableWarning
      aria-label="Demo writing text"
      role="textbox"
      aria-multiline="true"
      spellCheck
      onInput={(event) => ui.count(wordCount(event.currentTarget.innerText))}
      onBlur={(event) => {
        const node = event.currentTarget
        const blocks = [...node.children]
        const paragraphOnly =
          blocks.length > 0 &&
          blocks.length === node.childNodes.length &&
          blocks.every((block) => block.tagName === 'P')
        const body = paragraphOnly
          ? blocks
              .map((block) =>
                block.childNodes.length === 1 && block.firstChild?.nodeName === 'BR'
                  ? ''
                  : (block as HTMLElement).innerText,
              )
              .join(isPoem ? '\n' : '\n\n')
          : node.innerText
        ui.update({ body })
      }}
    />
  )
}
function WritingFooter({ ui }: { ui: UI }) {
  return (
    <div className="writing-footer">
      <span>{ui.words} words</span>
      <span>{ui.doc.kind === 'poem' ? '2 stanzas' : 'Working draft'}</span>
      <button onClick={() => ui.menu('history')}>Version history</button>
    </div>
  )
}
function Format({ ui }: { ui: UI }) {
  return (
    <div className="format">
      <span className="format-kind">
        {ui.doc.kind === 'poem' ? 'Verse' : 'Body text'}
        <Icon name="down" size={12} />
      </span>
      <span className="format-rule" />
      <button
        aria-label="Bold demo selection"
        onClick={() => ui.notify('Bold selected in this preview.')}
      >
        <b>B</b>
      </button>
      <button
        aria-label="Italic demo selection"
        onClick={() => ui.notify('Italic selected in this preview.')}
      >
        <i>I</i>
      </button>
      <button onClick={() => ui.menu('comment')}>Comment</button>
      <span className="format-spacer" />
      <button onClick={ui.toggleFocus} aria-pressed={ui.focus}>
        Focus
      </button>
    </div>
  )
}
function Tools({
  ui,
  compact = false,
  refined = false,
}: {
  ui: UI
  compact?: boolean
  refined?: boolean
}) {
  const tabsId = useId()
  const tabs =
    ui.doc.kind === 'poem' ? ['Rhymes', 'Notes', 'Versions'] : ['Notes', 'Words', 'Versions']
  const activeTab = tabs.some((tab) => tab.toLowerCase() === ui.toolTab)
    ? ui.toolTab
    : tabs[0].toLowerCase()
  const [copyStatus, setCopyStatus] = useState('')
  useEffect(() => {
    if (!copyStatus) return
    const timer = setTimeout(() => setCopyStatus(''), 2500)
    return () => clearTimeout(timer)
  }, [copyStatus])
  function changeTab(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!refined || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    const current = tabs.findIndex((tab) => tab.toLowerCase() === activeTab)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    ui.setToolTab(tabs[next].toLowerCase())
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
  }
  async function copyWord(word: string) {
    try {
      await navigator.clipboard.writeText(word)
      setCopyStatus(`Copied “${word}”`)
    } catch {
      setCopyStatus('Copy unavailable. Select the word to copy it.')
    }
  }
  const content =
    activeTab === 'versions' ? (
      <div className="tool-content">
        <h4>Saved checkpoints</h4>
        <p>Keep a version before the next pass.</p>
        <button className="version-row" onClick={() => ui.notify('First complete draft selected.')}>
          <Icon name="history" />
          <span>
            First complete draft<small>Yesterday, 4:32 pm</small>
          </span>
        </button>
        <button
          className="version-row"
          onClick={() => ui.notify('Before the new ending selected.')}
        >
          <Icon name="history" />
          <span>
            Before the new ending<small>Oct 28, 10:16 am</small>
          </span>
        </button>
        <Button onClick={() => ui.menu('checkpoint')}>Name a checkpoint</Button>
      </div>
    ) : activeTab === 'notes' ? (
      <div className="tool-content">
        <h4>{refined ? 'Draft notes' : 'Keep close'}</h4>
        <p className="hand-note">
          The cup should return in the last scene. Let it do the work without explaining it.
        </p>
        {ui.notes.map((note, index) => (
          <p className="hand-note" key={index}>
            {note}
          </p>
        ))}
        <label className="note-field">
          A thought for later
          <textarea
            aria-label="New demo note"
            placeholder="Leave a note in the margin"
            onBlur={(event) => {
              const value = event.target.value.trim()
              if (value) {
                ui.addNote(value)
                event.target.value = ''
              }
            }}
          />
        </label>
      </div>
    ) : (
      <div className="tool-content">
        <p className="selected-word">{ui.doc.kind === 'poem' ? 'light' : 'quiet'}</p>
        <span className="word-caption" role={refined ? 'status' : undefined}>
          {copyStatus || (ui.doc.kind === 'poem' ? 'Perfect rhymes' : 'Alternatives')}
        </span>
        <div className="word-list">
          {(ui.doc.kind === 'poem'
            ? ['night', 'white', 'bright', 'slight', 'sight', 'flight']
            : ['still', 'hushed', 'calm', 'muted', 'soft', 'silent']
          ).map((word) => (
            <button
              key={word}
              title={refined ? `Copy ${word}` : undefined}
              aria-label={refined ? `Copy ${word}` : undefined}
              onClick={() =>
                refined
                  ? void copyWord(word)
                  : ui.notify(`${word} selected. Place the cursor in the draft to use it.`)
              }
            >
              {word}
            </button>
          ))}
        </div>
        {refined && <p className="tool-copy-hint">Choose a word to copy it.</p>}
        {!refined && ui.doc.kind === 'poem' && (
          <div className="meter-detail">
            <span className="word-caption">Syllables</span>
            <h4>A little variation</h4>
            <p>Your lines alternate between 10 and 11 syllables. Read the longer lines aloud.</p>
            <div className="syllable-bars">
              {[10, 11, 10, 11, 0, 10, 11, 10, 11].map((count, index) =>
                count ? (
                  <span key={index} style={{ width: `${count * 6}%` }}>
                    {count}
                  </span>
                ) : (
                  <i key={index} />
                ),
              )}
            </div>
          </div>
        )}
      </div>
    )
  return (
    <aside
      className={`tools ${compact ? 'tools-compact' : ''} ${refined ? 'tools-refined' : ''}`}
      aria-label="Writing tools"
    >
      <div className="tools-heading">
        <h3>
          {refined
            ? 'Writing tools'
            : ui.doc.kind === 'poem'
              ? 'At the line'
              : 'Alongside the draft'}
        </h3>
        <button
          title="Close writing tools"
          aria-label="Close writing tools"
          onClick={ui.toggleTools}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div
        className="tool-tabs"
        role={refined ? 'tablist' : undefined}
        aria-label={refined ? 'Writing tools' : undefined}
        onKeyDown={changeTab}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab.toLowerCase() ? 'active' : ''}
            role={refined ? 'tab' : undefined}
            aria-selected={refined ? activeTab === tab.toLowerCase() : undefined}
            aria-controls={refined ? `${tabsId}-panel` : undefined}
            id={refined ? `${tabsId}-${tab.toLowerCase()}` : undefined}
            tabIndex={refined ? (activeTab === tab.toLowerCase() ? 0 : -1) : undefined}
            onClick={() => ui.setToolTab(tab.toLowerCase())}
          >
            {tab}
          </button>
        ))}
      </div>
      {refined ? (
        <div
          role="tabpanel"
          id={`${tabsId}-panel`}
          aria-labelledby={`${tabsId}-${activeTab}`}
          tabIndex={0}
        >
          {content}
        </div>
      ) : (
        content
      )}
    </aside>
  )
}

function Rows({ ui, preview = false }: { ui: UI; preview?: boolean }) {
  return (
    <div className={`document-rows ${preview ? 'preview-rows' : ''}`}>
      {ui.filtered.map((doc) => (
        <button
          key={doc.id}
          className={`document-row ${ui.doc.id === doc.id ? 'selected' : ''}`}
          onClick={() => ui.open(doc.id)}
        >
          <span className="row-title">
            <strong>{doc.title}</strong>
            <small>{doc.body.split('\n')[0]}</small>
          </span>
          <Type kind={doc.kind} />
          <span className="row-words">{wordCount(doc.body)} words</span>
          <Status value={doc.status} />
          <time>{doc.date}</time>
        </button>
      ))}
    </div>
  )
}
function Binder({ ui }: { ui: UI }) {
  return (
    <div className="binder">
      <div className="binder-title">
        <span>Project</span>
        <h2>River notebook</h2>
        <p>Chapters, poems, and the things between.</p>
      </div>
      <div className="binder-section">
        <span>Manuscript</span>
        <button aria-label="Add chapter" onClick={() => ui.create('story')}>
          <Icon name="plus" size={15} />
        </button>
      </div>
      {ui.project
        .filter((doc) => doc.kind !== 'idea')
        .map((doc, index) => (
          <button
            className={`binder-file ${ui.doc.id === doc.id && ui.screen === 'editor' ? 'active' : ''}`}
            key={doc.id}
            onClick={() => ui.open(doc.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span>{doc.title}</span>
          </button>
        ))}
      <div className="binder-section">
        <span>Research & ideas</span>
      </div>
      {ui.docs
        .filter((doc) => doc.kind === 'idea' && doc.collection === 'River notebook')
        .map((doc) => (
          <button
            key={doc.id}
            className={`binder-file ${ui.doc.id === doc.id && ui.screen === 'editor' ? 'active' : ''}`}
            onClick={() => ui.open(doc.id)}
          >
            <Icon name="note" size={14} />
            <span>{doc.title}</span>
          </button>
        ))}
      <button className="binder-overview" onClick={() => ui.go('project')}>
        See the whole project
        <Icon name="arrow" size={15} />
      </button>
    </div>
  )
}
function Outline({ ui, notebook = false }: { ui: UI; notebook?: boolean }) {
  return (
    <div className={`outline ${notebook ? 'notebook-outline' : ''}`}>
      {ui.project.map((doc, index) => (
        <div
          className="outline-entry"
          key={doc.id}
          draggable
          onDragStart={(event) => event.dataTransfer.setData('text/plain', doc.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const from = ui.project.findIndex(
              (item) => item.id === event.dataTransfer.getData('text/plain'),
            )
            if (from >= 0) ui.move(ui.project[from].id, index - from)
          }}
        >
          <span className="chapter-number">{String(index + 1).padStart(2, '0')}</span>
          <button className="outline-title" onClick={() => ui.open(doc.id)}>
            <strong>{doc.title}</strong>
            <span>
              {doc.kind === 'idea' ? 'Research' : doc.kind === 'poem' ? 'Poem' : 'Chapter'}
              <em>{wordCount(doc.body)} words</em>
            </span>
          </button>
          <Status value={doc.status} />
          <div className="order-controls">
            <button
              disabled={index === 0}
              aria-label={`Move ${doc.title} up`}
              onClick={() => ui.move(doc.id, -1)}
            >
              Up
            </button>
            <button
              disabled={index === ui.project.length - 1}
              aria-label={`Move ${doc.title} down`}
              onClick={() => ui.move(doc.id, 1)}
            >
              Down
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
function ProjectHead({ ui }: { ui: UI }) {
  return (
    <div className="project-heading">
      <span className="context-label">Project</span>
      <h1>River notebook</h1>
      <p>A story in chapters, with research and fragments kept close.</p>
      <div className="project-actions">
        <Button primary onClick={() => ui.create('story')}>
          <Icon name="plus" />
          New chapter
        </Button>
        <Button onClick={() => ui.create('idea')}>Add an idea</Button>
      </div>
    </div>
  )
}

export function VariantA({ ui }: { ui: UI }) {
  return (
    <div className="index-shell">
      <aside className="index-sidebar">
        <Brand />
        <Nav ui={ui} />
        <div className="nav-label">Your projects</div>
        <button className="project-link active-project" onClick={() => ui.go('project')}>
          <span className="project-dot" />
          River notebook<span>4</span>
        </button>
        <button
          className="project-link"
          onClick={() => ui.notify('Small hours selected in this preview.')}
        >
          <span className="project-dot pale" />
          Small hours<span>3</span>
        </button>
        <div className="sidebar-bottom">
          <button onClick={() => ui.menu('backups')}>
            <Icon name="history" />
            Backups
          </button>
          <button onClick={() => ui.menu('settings')}>
            <Icon name="settings" />
            Settings
          </button>
          <span className="local-label">
            <span />
            On this computer
          </span>
        </div>
      </aside>
      <section className="index-main">
        <header className="index-header">
          <div>
            <span className="breadcrumb">Workspace</span>
            <h1>
              {ui.screen === 'library'
                ? 'Library'
                : ui.screen === 'project'
                  ? 'River notebook'
                  : ui.doc.title}
            </h1>
          </div>
          <div className="header-actions">
            {ui.screen === 'editor' ? (
              <>
                <span className="save-status">
                  <Icon name="check" size={14} />
                  Saved
                </span>
                <Button onClick={ui.toggleTools}>
                  <Icon name="tools" />
                  Tools
                </Button>
                <Button onClick={() => ui.menu('export')}>
                  <Icon name="export" />
                  Export
                </Button>
              </>
            ) : (
              <Button primary onClick={() => ui.menu('new')}>
                <Icon name="plus" />
                New writing
              </Button>
            )}
          </div>
        </header>
        {ui.screen === 'library' ? (
          <main className="index-library">
            <div className="section-intro">
              <h2>All your writing</h2>
              <p>A place for the draft, the finished piece, and the first thought.</p>
            </div>
            <div className="library-controls">
              <KindTabs ui={ui} />
              <Search ui={ui} />
            </div>
            <div className="table-labels">
              <span>Title</span>
              <span>Type</span>
              <span>Length</span>
              <span>Status</span>
              <span>Edited</span>
            </div>
            <Rows ui={ui} />
            <div className="list-footer">
              {ui.filtered.length} documents
              <button onClick={() => ui.menu('import')}>Import writing</button>
            </div>
          </main>
        ) : ui.screen === 'editor' ? (
          <div className="index-editor">
            <div className="index-file-list">
              <div className="files-header">
                River notebook
                <Icon name="project" size={15} />
              </div>
              {ui.project.map((doc) => (
                <button
                  key={doc.id}
                  className={doc.id === ui.doc.id ? 'active' : ''}
                  onClick={() => ui.open(doc.id)}
                >
                  <Type kind={doc.kind} />
                  <span>{doc.title}</span>
                </button>
              ))}
              <button className="new-file" onClick={() => ui.menu('new')}>
                <Icon name="plus" size={15} />
                Add writing
              </button>
            </div>
            <main className="index-page">
              <Format ui={ui} />
              <article className="manuscript">
                <div className="document-context">
                  <Type kind={ui.doc.kind} />
                  <Status value={ui.doc.status} />
                </div>
                <Title ui={ui} />
                <Writing ui={ui} numbers={ui.doc.kind === 'poem'} />
                <WritingFooter ui={ui} />
              </article>
            </main>
            {ui.tools && <Tools ui={ui} />}
          </div>
        ) : (
          <main className="index-project">
            <ProjectHead ui={ui} />
            <div className="project-section-title">
              <h2>Reading order</h2>
              <span>Drag to arrange</span>
            </div>
            <Outline ui={ui} />
            <div className="project-inline-note">
              <Icon name="note" />
              <p>
                <strong>The next pass</strong>Read the opening and closing scenes together. Watch
                what happens to the cup.
              </p>
              <button onClick={() => ui.menu('comment')}>Edit note</button>
            </div>
          </main>
        )}
      </section>
    </div>
  )
}

export function VariantB({ ui }: { ui: UI }) {
  return (
    <div className="folio-shell">
      <header className="folio-top">
        <Brand />
        <Nav ui={ui} />
        <div className="header-actions">
          <span className="save-status">
            <Icon name="check" size={14} />
            Saved on this computer
          </span>
          <button aria-label="Writing preferences" onClick={() => ui.menu('settings')}>
            <Icon name="settings" />
          </button>
        </div>
      </header>
      {ui.screen === 'library' ? (
        <main className="folio-library">
          <div className="folio-welcome">
            <p>Your writing room</p>
            <h1>One piece at a time.</h1>
            <Button primary onClick={() => ui.menu('new')}>
              <Icon name="plus" />
              Start something
            </Button>
          </div>
          <section className="folio-project-shelf">
            <div className="folio-section-title">
              <h2>Projects</h2>
              <button onClick={() => ui.go('project')}>
                All projects
                <Icon name="arrow" size={15} />
              </button>
            </div>
            <button className="folio-book" onClick={() => ui.go('project')}>
              <span className="book-spine">River notebook</span>
              <span className="book-info">
                <strong>River notebook</strong>
                <span>A story in chapters, with the research kept close.</span>
                <small>3 pieces of writing and a notebook of ideas</small>
              </span>
              <span className="book-contents">
                The crossing
                <br />A room above the station
                <br />
                Low water
              </span>
              <Icon name="arrow" />
            </button>
            <button
              className="folio-book book-secondary"
              onClick={() => ui.notify('Small hours opened in this preview.')}
            >
              <span className="book-spine">Small hours</span>
              <span className="book-info">
                <strong>Small hours</strong>
                <span>Poems and short pieces from the last few months.</span>
                <small>3 pieces of writing</small>
              </span>
              <span className="book-contents">
                Winter oranges
                <br />
                Letter from the coast
                <br />
                The visitor
              </span>
              <Icon name="arrow" />
            </button>
          </section>
          <section className="folio-recent">
            <div className="folio-section-title">
              <h2>On your desk</h2>
              <Search ui={ui} />
            </div>
            <Rows ui={{ ...ui, filtered: ui.filtered.slice(0, 4) }} />
          </section>
        </main>
      ) : (
        <div className="folio-workspace">
          <aside className="folio-binder">
            <Binder ui={ui} />
            <button className="binder-library" onClick={() => ui.go('library')}>
              <Icon name="back" size={15} />
              All writing
            </button>
          </aside>
          <main className="folio-spread">
            {ui.screen === 'project' ? (
              <>
                <section className="folio-outline">
                  <ProjectHead ui={ui} />
                  <div className="folio-rule" />
                  <h2>Contents</h2>
                  <Outline ui={ui} />
                </section>
                <aside className="folio-research">
                  <div className="folio-page-number">Research</div>
                  <h2>What belongs nearby</h2>
                  <p>Keep the draft in the foreground. Leave the useful fragments here.</p>
                  {ui.docs
                    .filter((doc) => doc.kind === 'idea' && doc.collection === 'River notebook')
                    .map((doc) => (
                      <button
                        key={doc.id}
                        className="research-entry"
                        onClick={() => ui.open(doc.id)}
                      >
                        <strong>{doc.title}</strong>
                        <span>{doc.body.split('\n')[0]}</span>
                      </button>
                    ))}
                  <Button onClick={() => ui.create('idea')}>
                    <Icon name="plus" size={15} />
                    New research idea
                  </Button>
                </aside>
              </>
            ) : (
              <>
                <section className="folio-writing">
                  <div className="folio-page-number">
                    River notebook <span>{kindName(ui.doc.kind)}</span>
                  </div>
                  <div className="folio-document-top">
                    <Title ui={ui} />
                    <button aria-label="Export document" onClick={() => ui.menu('export')}>
                      <Icon name="export" />
                    </button>
                  </div>
                  <Format ui={ui} />
                  <Writing ui={ui} />
                  <WritingFooter ui={ui} />
                </section>
                <aside className="folio-facing">
                  <div className="folio-page-number">
                    The facing page
                    <button onClick={ui.toggleTools}>
                      {ui.tools ? 'Hide notes' : 'Show notes'}
                    </button>
                  </div>
                  {ui.tools ? (
                    <Tools ui={ui} />
                  ) : (
                    <div className="folio-blank">
                      <Icon name="note" size={32} />
                      <h3>A little breathing room.</h3>
                      <p>Open your notes when you need them.</p>
                      <Button onClick={ui.toggleTools}>Show notes</Button>
                    </div>
                  )}
                </aside>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export function VariantC({ ui }: { ui: UI }) {
  return (
    <MarginWorkspace
      ui={ui}
      writing={<Writing ui={ui} />}
      outline={<Outline ui={ui} />}
      tools={(close) => <Tools refined ui={{ ...ui, toggleTools: close }} />}
    />
  )
}

export function VariantD({ ui }: { ui: UI }) {
  return (
    <div className="studio-shell">
      <aside className="studio-rail">
        <button className="studio-mark" onClick={() => ui.go('library')}>
          W!
        </button>
        <Nav ui={ui} rail />
        <div className="rail-bottom">
          <button onClick={() => ui.menu('backups')} aria-label="Backups">
            <Icon name="history" />
          </button>
          <button onClick={() => ui.menu('settings')} aria-label="Settings">
            <Icon name="settings" />
          </button>
        </div>
      </aside>
      <section className="studio-main">
        <header className="studio-header">
          <div>
            <span>{ui.screen === 'editor' ? 'River notebook' : 'Your workspace'}</span>
            <strong>
              {ui.screen === 'library'
                ? 'Library'
                : ui.screen === 'project'
                  ? 'Project board'
                  : ui.doc.title}
            </strong>
          </div>
          <div className="header-actions">
            {ui.screen === 'editor' ? (
              <>
                <button className="studio-focus" onClick={ui.toggleFocus}>
                  {ui.focus ? 'Exit focus' : 'Focus'}
                </button>
                <Button onClick={() => ui.menu('checkpoint')}>
                  <Icon name="history" />
                  Checkpoint
                </Button>
                <Button onClick={() => ui.menu('export')}>
                  <Icon name="export" />
                  Export
                </Button>
              </>
            ) : (
              <Button primary onClick={() => ui.menu('new')}>
                <Icon name="plus" />
                New writing
              </Button>
            )}
          </div>
        </header>
        {ui.screen === 'library' ? (
          <div className="studio-browser">
            <section className="studio-file-browser">
              <div className="studio-search">
                <Search ui={ui} />
                <KindTabs ui={ui} />
              </div>
              {ui.filtered.map((doc) => (
                <button
                  key={doc.id}
                  className={`studio-file ${doc.id === ui.doc.id ? 'selected' : ''}`}
                  onClick={() => ui.select(doc.id)}
                >
                  <Type kind={doc.kind} />
                  <span>
                    <strong>{doc.title}</strong>
                    <small>{doc.collection}</small>
                  </span>
                  <Status value={doc.status} />
                </button>
              ))}
            </section>
            <section className="studio-preview">
              <div className="preview-heading">
                <span>On your desk</span>
                <button onClick={() => ui.go('editor')}>
                  Open in editor
                  <Icon name="arrow" size={15} />
                </button>
              </div>
              <Type kind={ui.doc.kind} />
              <h1>{ui.doc.title}</h1>
              <div className="preview-body">
                {ui.doc.body.split('\n').map((line, index) => (
                  <p key={index}>{line || <br />}</p>
                ))}
              </div>
              <div className="preview-properties">
                <dl>
                  <dt>Project</dt>
                  <dd>{ui.doc.collection}</dd>
                  <dt>Status</dt>
                  <dd>{ui.doc.status}</dd>
                  <dt>Length</dt>
                  <dd>{wordCount(ui.doc.body)} words</dd>
                </dl>
              </div>
            </section>
          </div>
        ) : ui.screen === 'project' ? (
          <main className="studio-project">
            <ProjectHead ui={ui} />
            <div className="studio-board">
              {(['Draft', 'Revising', 'Done'] as const).map((status) => (
                <section key={status}>
                  <h2>
                    {status}
                    <span>
                      {
                        ui.docs.filter(
                          (doc) => doc.status === status && doc.collection === 'River notebook',
                        ).length
                      }
                    </span>
                  </h2>
                  {ui.docs
                    .filter((doc) => doc.status === status && doc.collection === 'River notebook')
                    .map((doc) => (
                      <button
                        className="studio-board-card"
                        key={doc.id}
                        onClick={() => ui.open(doc.id)}
                      >
                        <Type kind={doc.kind} />
                        <h3>{doc.title}</h3>
                        <p>{doc.body.split('\n')[0]}</p>
                        <span>{wordCount(doc.body)} words</span>
                      </button>
                    ))}
                  <button className="board-add" onClick={() => ui.create('story')}>
                    <Icon name="plus" size={15} />
                    Add writing
                  </button>
                </section>
              ))}
            </div>
          </main>
        ) : (
          <div className="studio-editor">
            <aside className="studio-outline">
              <span>In this project</span>
              {ui.project.map((doc) => (
                <button
                  className={ui.doc.id === doc.id ? 'active' : ''}
                  key={doc.id}
                  onClick={() => ui.open(doc.id)}
                >
                  {doc.title}
                </button>
              ))}
            </aside>
            <div className="studio-editor-center">
              <div className="studio-editor-toolbar">
                <Type kind={ui.doc.kind} />
                <Status value={ui.doc.status} />
                <span>Saved locally</span>
                <button onClick={ui.toggleTools}>
                  <Icon name="tools" size={16} />
                  {ui.tools ? 'Hide workbench' : 'Workbench'}
                </button>
              </div>
              <main className="studio-paper">
                <Title ui={ui} />
                <Writing ui={ui} />
                <WritingFooter ui={ui} />
              </main>
              {ui.tools && (
                <div className="studio-dock">
                  <Tools ui={ui} compact />
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export function VariantE({ ui }: { ui: UI }) {
  return (
    <div className="common-shell">
      <header className="common-header">
        <Brand />
        <div className="common-title">A place to keep your words.</div>
        <nav>
          <button
            className={ui.screen === 'library' ? 'active' : ''}
            onClick={() => ui.go('library')}
          >
            Notebook
          </button>
          <button
            className={ui.screen === 'project' ? 'active' : ''}
            onClick={() => ui.go('project')}
          >
            Projects
          </button>
          <button aria-label="Search writing" onClick={() => ui.menu('search')}>
            <Icon name="search" />
          </button>
          <button aria-label="Writing preferences" onClick={() => ui.menu('settings')}>
            <Icon name="settings" />
          </button>
        </nav>
      </header>
      <div className="common-shell-inner">
        <nav className="common-index" aria-label="Notebook index">
          {(['all', 'poem', 'story', 'idea'] as const).map((kind) => (
            <button
              key={kind}
              className={ui.kind === kind ? 'active' : ''}
              onClick={() => {
                ui.filter(kind)
                ui.go('library')
              }}
            >
              {kind === 'all' ? 'All writing' : plural(kind)}
            </button>
          ))}
          <button className="common-new" onClick={() => ui.menu('new')}>
            <Icon name="plus" size={16} />
            New entry
          </button>
        </nav>
        {ui.screen === 'library' ? (
          <main className="common-library">
            <div className="common-library-title">
              <h1>Your notebook</h1>
              <span>October 2026</span>
            </div>
            <div className="common-library-columns">
              <section className="common-entries">
                <h2>Recently on the page</h2>
                {ui.filtered.slice(0, 6).map((doc, index) => (
                  <button key={doc.id} className="common-entry" onClick={() => ui.open(doc.id)}>
                    <span className="entry-date">
                      {index < 3 ? '31' : '30'}
                      <small>October</small>
                    </span>
                    <span>
                      <Type kind={doc.kind} />
                      <h3>{doc.title}</h3>
                      <p>{doc.body.split('\n')[0]}</p>
                    </span>
                    <Icon name="arrow" size={17} />
                  </button>
                ))}
              </section>
              <aside className="common-fragments">
                <h2>Loose leaves</h2>
                <p>A thought does not have to know what it is yet.</p>
                {ui.docs
                  .filter((doc) => doc.kind === 'idea')
                  .slice(0, 3)
                  .map((doc) => (
                    <button key={doc.id} onClick={() => ui.open(doc.id)}>
                      <h3>{doc.title}</h3>
                      <p>{doc.body.split('\n')[0]}</p>
                    </button>
                  ))}
                <button className="common-add-idea" onClick={() => ui.create('idea')}>
                  <Icon name="plus" size={16} />
                  Keep an idea
                </button>
              </aside>
            </div>
          </main>
        ) : ui.screen === 'project' ? (
          <main className="common-project">
            <div className="common-project-page">
              <span className="book-label">Collected writing</span>
              <ProjectHead ui={ui} />
              <h2>In this notebook</h2>
              <Outline ui={ui} notebook />
              <div className="common-end-note">
                Some things become a story. Some things stay a note.
              </div>
            </div>
            <aside className="common-project-side">
              <Icon name="note" size={25} />
              <h2>Between the pages</h2>
              <p>
                The cup, the station clock, the coat. These are the things that keep coming back.
              </p>
              <button onClick={() => ui.open('objects')}>Open the source idea</button>
            </aside>
          </main>
        ) : (
          <div className="common-editor">
            <aside className="common-margin">
              <button onClick={() => ui.go('project')}>River notebook</button>
              <span>{kindName(ui.doc.kind)}</span>
              <div className="margin-date">
                31<small>October</small>
              </div>
              <Status value={ui.doc.status} />
              <button onClick={() => ui.menu('checkpoint')}>Keep a version</button>
            </aside>
            <main className="common-paper">
              <div className="common-paper-head">
                <span>A work in progress</span>
                <button onClick={() => ui.menu('export')}>
                  <Icon name="export" size={16} />
                  Export
                </button>
              </div>
              <Title ui={ui} />
              <Writing ui={ui} />
              <WritingFooter ui={ui} />
            </main>
            <aside className="common-notes">
              <button className="common-notes-toggle" onClick={ui.toggleTools}>
                <Icon name="note" size={17} />
                Margin notes
              </button>
              {ui.tools && (
                <>
                  <p>The cup should return in the last scene.</p>
                  <div className="pencil-rule" />
                  <p>Does the ending need one less line?</p>
                  <button onClick={() => ui.menu('comment')}>
                    <Icon name="plus" size={15} />
                    Add a thought
                  </button>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function OverviewCard({
  direction,
  screen,
  onOpen,
}: {
  direction: (typeof directions)[number]
  screen: Screen
  onOpen: () => void
}) {
  const frame = useRef<HTMLButtonElement>(null)
  const [scale, setScale] = useState(0.35)
  useEffect(() => {
    const node = frame.current
    if (!node) return
    const observer = new ResizeObserver(() => setScale(node.clientWidth / 1440))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <article className="direction-card">
      <button
        className="miniature"
        ref={frame}
        onClick={onOpen}
        aria-label={`Open ${direction.name}`}
      >
        <iframe
          title={`${direction.name} ${screen} preview`}
          src={`/prototype/ui?variant=${direction.id}&screen=${screen}&capture=1`}
          tabIndex={-1}
          style={{ transform: `scale(${scale})` }}
        />
        <span className="open-direction">
          Open {direction.name}
          <Icon name="arrow" size={16} />
        </span>
      </button>
      <div className="direction-description">
        <span>{direction.id}</span>
        <div>
          <h2>{direction.name}</h2>
          <p>{direction.description}</p>
          <small>{direction.structure}</small>
        </div>
        <div className="palette">
          {direction.palette.map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
        </div>
      </div>
    </article>
  )
}

export function UIPrototypeGallery() {
  const [params, setParams] = useSearchParams()
  const variant = (directions.find((item) => item.id === params.get('variant'))?.id ??
    'A') as Direction
  const screen = (
    ['library', 'editor', 'project'].includes(params.get('screen') ?? '')
      ? params.get('screen')
      : 'editor'
  ) as Screen
  const overview = params.get('view') === 'overview',
    capture = params.get('capture') === '1'
  const [docs, setDocs] = useState<DemoDoc[]>(() => initialDocs.map((doc) => ({ ...doc })))
  const doc = docs.find((doc) => doc.id === params.get('doc')) ?? docs[0]
  const [kind, setKind] = useState<'all' | Kind>('all'),
    [query, setQuery] = useState('')
  const defaultTools = (direction: Direction) =>
    direction === 'C'
      ? params.get('workspace') === 'expanded' && params.get('tools') !== 'closed'
      : !(direction === 'A' && window.matchMedia('(max-width:600px)').matches)
  const [tools, setTools] = useState(() => defaultTools(variant)),
    [focus, setFocus] = useState(false)
  const [toolTab, setToolTab] = useState('rhymes'),
    [notes, setNotes] = useState<string[]>([])
  const [projectOrder, setOrder] = useState(['crossing', 'train', 'water', 'objects'])
  const [menu, setMenu] = useState(''),
    [toast, setToast] = useState('')
  const [liveWords, setLiveWords] = useState<{
    id: string
    value: number
  } | null>(null)
  const [measure, setMeasure] = useState('normal'),
    [font, setFont] = useState('serif')
  const modalInput = useRef<HTMLInputElement>(null),
    modal = useRef<HTMLDivElement>(null)
  function route(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    )
    setParams(next, { replace: true })
  }
  function cycle(delta: number) {
    const index = directions.findIndex((item) => item.id === variant)
    const next = directions[(index + delta + directions.length) % directions.length]
    setTools(defaultTools(next.id))
    route({ variant: next.id, view: null })
  }
  function open(id: string) {
    const target = docs.find((item) => item.id === id)
    setToolTab(target?.kind === 'poem' ? 'rhymes' : 'notes')
    setMenu('')
    route({ screen: 'editor', doc: id, view: null })
  }
  function notify(text: string) {
    setToast(text)
  }
  function create(kind: Kind) {
    const fresh: DemoDoc = {
      id: `demo-${docs.length + 1}`,
      kind,
      title: `Untitled ${kindName(kind).toLowerCase()}`,
      body: '',
      status: 'Draft',
      date: 'Today',
      collection: 'River notebook',
    }
    setDocs((current) => [fresh, ...current])
    setOrder((current) => [...current, fresh.id])
    setToolTab(kind === 'poem' ? 'rhymes' : 'notes')
    route({ screen: 'editor', doc: fresh.id, view: null })
    setMenu('')
  }
  const filtered = docs.filter(
    (doc) =>
      (kind === 'all' || doc.kind === kind) &&
      (!query || `${doc.title} ${doc.body}`.toLowerCase().includes(query.toLowerCase())),
  )
  const project = projectOrder
    .map((id) => docs.find((doc) => doc.id === id))
    .filter((doc): doc is DemoDoc => Boolean(doc))
  const ui: UI = {
    variant,
    screen,
    docs,
    doc,
    filtered,
    kind,
    query,
    tools,
    focus,
    toolTab,
    project,
    words: liveWords?.id === doc.id ? liveWords.value : wordCount(doc.body),
    notes,
    go: (screen) => route({ screen, view: null }),
    open,
    select: (id) =>
      window.matchMedia('(max-width:600px)').matches ? open(id) : route({ doc: id }),
    create,
    filter: setKind,
    search: setQuery,
    toggleTools: () => setTools((value) => !value),
    toggleFocus: () => setFocus((value) => !value),
    setToolTab,
    update: (changes) =>
      setDocs((current) =>
        current.map((item) => (item.id === doc.id ? { ...item, ...changes } : item)),
      ),
    count: (value) => setLiveWords({ id: doc.id, value }),
    move: (id, delta) =>
      setOrder((current) => {
        const next = [...current],
          index = next.indexOf(id),
          target = Math.max(0, Math.min(next.length - 1, index + delta))
        next.splice(index, 1)
        next.splice(target, 0, id)
        return next
      }),
    menu: setMenu,
    notify,
    addNote: (text) => setNotes((current) => [...current, text]),
  }
  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenu('')
        setToast('')
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMenu('search')
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        notify('Demo draft kept for this preview.')
        return
      }
      const editing =
        event.target instanceof Element &&
        event.target.closest('input,textarea,select,[contenteditable],dialog,[role=dialog]')
      if (editing) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        cycle(event.key === 'ArrowRight' ? 1 : -1)
      }
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  })
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (menu)
      requestAnimationFrame(() => {
        ;(modalInput.current ?? modal.current)?.focus()
      })
  }, [menu])
  useEffect(() => {
    console.info('[WR!TE UI prototype]', {
      variant,
      screen,
      document: doc.id,
      kindFilter: kind,
      search: query,
      tools,
      focus,
    })
  }, [variant, screen, doc.id, kind, query, tools, focus])
  const direction = directions.find((item) => item.id === variant)!
  const style = {
    '--measure': measure === 'narrow' ? '34rem' : measure === 'wide' ? '58rem' : '44rem',
    '--writing-font': font === 'sans' ? "'Segoe UI',system-ui,sans-serif" : undefined,
  } as CSSProperties
  return (
    <div
      className={`write-ui dir-${variant} ${capture ? 'is-capture' : ''} ${focus ? 'is-focus' : ''} ${overview ? 'is-overview' : ''}`}
      style={style}
    >
      <div className="prototype-stage">
        {overview ? (
          <main className="overview">
            <header>
              <Brand />
              <span>Interface studies</span>
            </header>
            <div className="overview-intro">
              <h1>Choose a writing space.</h1>
              <p>
                Five directions for the same app. Compare the Library, Editor, and Project views,
                then open a direction to try it.
              </p>
              <div className="overview-screens">
                {(['library', 'editor', 'project'] as const).map((view) => (
                  <button
                    className={screen === view ? 'active' : ''}
                    key={view}
                    onClick={() => route({ screen: view })}
                  >
                    {view === 'editor' ? 'Editor' : view === 'project' ? 'Project' : 'Library'}
                  </button>
                ))}
              </div>
            </div>
            <div className="direction-grid">
              {directions.map((item) => (
                <OverviewCard
                  key={`${item.id}-${screen}`}
                  direction={item}
                  screen={screen}
                  onOpen={() => {
                    setTools(defaultTools(item.id))
                    route({ variant: item.id, view: null })
                  }}
                />
              ))}
            </div>
            <p className="overview-note">
              These are interactive visual prototypes with sample writing. Try combining the
              organization of one with the writing surface of another.
            </p>
          </main>
        ) : variant === 'A' ? (
          <VariantA ui={ui} />
        ) : variant === 'B' ? (
          <VariantB ui={ui} />
        ) : variant === 'C' ? (
          <VariantC ui={ui} />
        ) : variant === 'D' ? (
          <VariantD ui={ui} />
        ) : (
          <VariantE ui={ui} />
        )}
      </div>
      {!capture && (
        <nav className="prototype-switcher" aria-label="Mockup controls">
          <div className="direction-switch">
            <button aria-label="Previous direction" onClick={() => cycle(-1)}>
              <Icon name="back" />
            </button>
            <div>
              <span>UI prototype {variant} / E</span>
              <select
                aria-label="Design direction"
                value={variant}
                onChange={(event) => {
                  setTools(defaultTools(event.target.value as Direction))
                  route({ variant: event.target.value, view: null })
                }}
              >
                {directions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id}. {item.name}
                  </option>
                ))}
              </select>
            </div>
            <button aria-label="Next direction" onClick={() => cycle(1)}>
              <Icon name="arrow" />
            </button>
          </div>
          <div className="preview-screens">
            {(['library', 'editor', 'project'] as const).map((view) => (
              <button
                aria-pressed={screen === view}
                className={screen === view ? 'active' : ''}
                key={view}
                onClick={() => route({ screen: view, view: null })}
              >
                {view === 'editor' ? 'Editor' : view === 'project' ? 'Project' : 'Library'}
              </button>
            ))}
          </div>
          <div className="preview-extras">
            {screen === 'editor' && !overview && (
              <select
                aria-label="Writing type"
                value={doc.kind}
                onChange={(event) =>
                  open(docs.find((item) => item.kind === event.target.value)!.id)
                }
              >
                <option value="poem">Poem</option>
                <option value="story">Story</option>
                <option value="idea">Idea</option>
              </select>
            )}
            <button onClick={() => route({ view: overview ? null : 'overview' })}>
              <Icon name="grid" size={16} />
              <span>{overview ? 'Close gallery' : 'All directions'}</span>
            </button>
          </div>
          <div className="prototype-state">
            <span>Sample writing</span>
            <span>{tools ? 'Tools open' : 'Tools closed'}</span>
            <span>{focus ? 'Focus on' : 'Focus off'}</span>
            <details>
              <summary>State</summary>
              <pre>
                {JSON.stringify(
                  {
                    variant,
                    direction: direction.name,
                    screen,
                    document: doc.title,
                    type: doc.kind,
                    filter: kind,
                    query,
                    tools,
                    focus,
                    notes: notes.length,
                    projectOrder,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
            <span className="prototype-reset-note">Changes reset on refresh</span>
          </div>
        </nav>
      )}
      {toast && (
        <div className="prototype-toast" role="status">
          {toast}
        </div>
      )}
      {menu && (
        <div
          className="prototype-modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setMenu('')
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              menu === 'new'
                ? 'New writing'
                : menu === 'settings'
                  ? 'Writing preferences'
                  : menu === 'search'
                    ? 'Find writing'
                    : menu
            }
            ref={modal}
            tabIndex={-1}
            className="prototype-modal"
          >
            <button className="modal-close" aria-label="Close dialog" onClick={() => setMenu('')}>
              <Icon name="close" />
            </button>
            {menu === 'new' ? (
              <>
                <h2>What are you working on?</h2>
                <p>Start with a shape. You can keep the rest open.</p>
                <div className="new-writing-options">
                  {(['poem', 'story', 'idea'] as const).map((kind) => (
                    <button key={kind} onClick={() => create(kind)}>
                      <Type kind={kind} />
                      <strong>New {kindName(kind).toLowerCase()}</strong>
                      <span>
                        {kind === 'poem'
                          ? 'A few lines, and the tools to hear them.'
                          : kind === 'story'
                            ? 'A draft with room to grow.'
                            : 'A note, a fragment, something to return to.'}
                      </span>
                      <Icon name="arrow" size={16} />
                    </button>
                  ))}
                </div>
              </>
            ) : menu === 'settings' ? (
              <>
                <h2>Make room for your writing.</h2>
                <label>
                  Writing width
                  <select value={measure} onChange={(event) => setMeasure(event.target.value)}>
                    <option value="narrow">Narrow</option>
                    <option value="normal">Comfortable</option>
                    <option value="wide">Wide</option>
                  </select>
                </label>
                <label>
                  Writing typeface
                  <select value={font} onChange={(event) => setFont(event.target.value)}>
                    <option value="serif">Serif</option>
                    <option value="sans">Sans serif</option>
                  </select>
                </label>
                <p>These settings affect this preview.</p>
              </>
            ) : menu === 'search' ? (
              <>
                <h2>Find your writing</h2>
                <label className="modal-search">
                  <Icon name="search" />
                  <input
                    autoFocus
                    ref={modalInput}
                    aria-label="Find writing"
                    placeholder="Search titles and writing"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <div className="modal-results">
                  {filtered.slice(0, 7).map((item) => (
                    <button key={item.id} onClick={() => open(item.id)}>
                      <Type kind={item.kind} />
                      {item.title}
                      <Icon name="arrow" size={14} />
                    </button>
                  ))}
                </div>
              </>
            ) : menu === 'checkpoint' ? (
              <>
                <h2>Name this moment.</h2>
                <p>Keep a version before the next pass.</p>
                <label>
                  Checkpoint name
                  <input ref={modalInput} placeholder="Before the new ending" />
                </label>
                <Button
                  primary
                  onClick={() => {
                    setMenu('')
                    notify('Checkpoint named in this preview.')
                  }}
                >
                  Keep this version
                </Button>
              </>
            ) : menu === 'comment' ? (
              <>
                <h2>A note in the margin</h2>
                <label>
                  Thought
                  <textarea id="demo-comment" placeholder="What do you want to return to?" />
                </label>
                <Button
                  primary
                  onClick={() => {
                    const value = (document.getElementById('demo-comment') as HTMLTextAreaElement)
                      ?.value
                    if (value) setNotes((current) => [...current, value])
                    setTools(true)
                    setToolTab('notes')
                    setMenu('')
                  }}
                >
                  Keep note
                </Button>
              </>
            ) : menu === 'export' ? (
              <>
                <h2>Take the writing with you.</h2>
                <div className="export-options">
                  {['Word document', 'Markdown', 'Plain text', 'Print / PDF'].map((format) => (
                    <button
                      key={format}
                      onClick={() => {
                        setMenu('')
                        notify(`${format} chosen. This preview does not create files.`)
                      }}
                    >
                      <Icon name="export" />
                      {format}
                      <Icon name="arrow" size={16} />
                    </button>
                  ))}
                </div>
              </>
            ) : menu === 'history' ? (
              <>
                <h2>A history of the draft</h2>
                <p>Two checkpoints kept along the way.</p>
                <div className="checkpoint-demo">
                  <strong>First complete draft</strong>
                  <span>Yesterday, 4:32 pm</span>
                </div>
                <div className="checkpoint-demo">
                  <strong>Before the new ending</strong>
                  <span>Oct 28, 10:16 am</span>
                </div>
                <Button
                  onClick={() => {
                    setMenu('')
                    notify('Version comparison selected in this preview.')
                  }}
                >
                  Compare versions
                </Button>
              </>
            ) : (
              <>
                <h2>{menu === 'backups' ? 'A separate copy.' : 'Bring your writing in.'}</h2>
                <p>
                  {menu === 'backups'
                    ? 'Choose a folder for automatic backups, or download a library copy.'
                    : 'Open a text, Markdown, or Word document and preview it before adding it.'}
                </p>
                <Button
                  primary
                  onClick={() => {
                    setMenu('')
                    notify('This is a visual preview. Your real library is separate.')
                  }}
                >
                  {menu === 'backups' ? 'Choose backup folder' : 'Choose document'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default function UIPrototype() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <UIPrototypeGallery />
    </BrowserRouter>
  )
}
