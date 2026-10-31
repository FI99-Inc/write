/* Refines the selected Margin direction; one mounted draft, two panel presets.
 * Mode and appearance are URL state. Writing remains in the parent demo store.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import type { UI } from './UIPrototype'
import { kindName, plural, wordCount } from './demoData'
import './margin-workspace.css'

const appearanceOptions = [
  {
    value: 'olive',
    label: 'Olive',
    description: 'Warm charcoal, cream, and muted brass.',
    dark: true,
  },
  { value: 'dusk', label: 'Dusk', description: 'A softer, lighter olive-grey.', dark: true },
  { value: 'sand', label: 'Sand', description: 'A middle tone with dark ink.', dark: false },
  { value: 'light', label: 'Light', description: 'The original near-white paper.', dark: false },
  { value: 'dark', label: 'Dark', description: 'The original cool dark palette.', dark: true },
] as const

type GlyphName =
  | 'project'
  | 'tools'
  | 'search'
  | 'close'
  | 'sun'
  | 'moon'
  | 'library'
  | 'write'
  | 'plus'
  | 'arrow'
  | 'back'
  | 'check'
  | 'history'
function Glyph({ name }: { name: GlyphName }) {
  const paths: Record<GlyphName, ReactNode> = {
    project: (
      <>
        <path d="M3 6h7l2 2h9v12H3zM3 6V4h7l2 2h9v2" />
      </>
    ),
    tools: (
      <>
        <path d="M4 5h16M4 12h16M4 19h16" />
        <circle cx="9" cy="5" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="8" cy="19" r="2" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
      </>
    ),
    moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />,
    library: (
      <>
        <path d="M4 4h4v16H4zm7 0h4v16h-4zm7 1 3 14" />
      </>
    ),
    write: <path d="m5 16-1 4 4-1L20 7l-3-3zM14 7l3 3" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    back: <path d="m15 5-7 7 7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    history: (
      <>
        <path d="M4 7v5h5M4 12a8 8 0 1 0 2-6" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  }
  return (
    <svg
      width="18"
      height="18"
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

interface Props {
  ui: UI
  writing: ReactNode
  tools: (close: () => void) => ReactNode
  outline: ReactNode
}

export function MarginWorkspace({ ui, writing, tools, outline }: Props) {
  const [params, setParams] = useSearchParams()
  const expanded = params.get('workspace') === 'expanded'
  const appearance =
    appearanceOptions.find((option) => option.value === params.get('appearance')) ??
    appearanceOptions[0]
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const appearanceRef = useRef<HTMLDivElement>(null)
  const appearanceButton = useRef<HTMLButtonElement>(null)
  const projectShown = params.get('nav') !== 'closed'
  const hadWorkspace = useRef(expanded)
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width:1159px)').matches)
  const [drawer, setDrawer] = useState<'project' | 'tools' | null>(null)
  const drawerRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const sizeProbe = useRef<HTMLSpanElement>(null)
  const lastDraftSelection = useRef<Range | null>(null)
  function route(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }
  function positionAppearance() {
    const button = appearanceButton.current,
      picker = appearanceRef.current
    if (!button || !picker) return
    const rect = button.getBoundingClientRect()
    picker.style.top = `${rect.bottom + 8}px`
    picker.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`
    picker.style.maxHeight = `${Math.max(180, window.innerHeight - rect.bottom - 24)}px`
  }
  useEffect(() => {
    if (!appearanceOpen) return
    window.addEventListener('resize', positionAppearance)
    return () => window.removeEventListener('resize', positionAppearance)
  }, [appearanceOpen])
  function fitTitle() {
    const node = titleRef.current
    if (!node || CSS.supports('field-sizing', 'content')) return
    node.style.height = '0px'
    node.style.height = `${node.scrollHeight}px`
  }
  useLayoutEffect(fitTitle, [ui.doc.id, ui.doc.title])
  useEffect(() => {
    const node = titleRef.current
    if (!node || CSS.supports('field-sizing', 'content')) return
    let width = 0
    const observer = new ResizeObserver((entries) => {
      if (entries[0].contentRect.width !== width) {
        width = entries[0].contentRect.width
        fitTitle()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ui.screen])
  useLayoutEffect(() => {
    const probe = sizeProbe.current
    if (!probe) return
    const update = () => setCompact(window.innerWidth < probe.getBoundingClientRect().width * 72.5)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(probe)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  useEffect(() => {
    const dialog = drawerRef.current
    if (!dialog) return
    if (drawer && !dialog.open) {
      dialog.showModal()
      const target = dialog.querySelector<HTMLElement>('[data-drawer-focus]')
      target?.focus({ preventScroll: true })
    } else if (!drawer && dialog.open) dialog.close()
  }, [drawer])
  // Toolbar pointer actions retain the current range, not just the document.
  function keepDraftFocus(event: MouseEvent<HTMLButtonElement>) {
    const active = document.activeElement
    if (active?.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection()
      lastDraftSelection.current = selection?.rangeCount
        ? selection.getRangeAt(0).cloneRange()
        : null
      event.preventDefault()
    }
  }
  function setWorkspace(value: boolean) {
    const scrollTop = canvasRef.current?.scrollTop ?? 0
    if (value && !hadWorkspace.current) {
      hadWorkspace.current = true
      if (!ui.tools && params.get('tools') !== 'closed') ui.toggleTools()
    }
    route({ workspace: value ? 'expanded' : null })
    setDrawer(null)
    requestAnimationFrame(() => {
      if (canvasRef.current) canvasRef.current.scrollTop = scrollTop
      const range = lastDraftSelection.current
      if (range?.startContainer.isConnected) {
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      lastDraftSelection.current = null
    })
  }
  function toggleProject() {
    if (compact || !expanded) setDrawer((value) => (value === 'project' ? null : 'project'))
    else route({ nav: projectShown ? 'closed' : null })
  }
  function toggleTools() {
    if (compact || !expanded) setDrawer((value) => (value === 'tools' ? null : 'tools'))
    else {
      route({ tools: ui.tools ? 'closed' : null })
      ui.toggleTools()
    }
  }
  function go(screen: UI['screen']) {
    setDrawer(null)
    ui.go(screen)
  }
  function open(id: string) {
    setDrawer(null)
    ui.open(id)
  }
  const activeProject = ui.doc.collection || 'Uncollected'
  const visibleProject = ui.docs.filter((doc) => doc.collection === activeProject)
  const orderedWriting = [
    ...ui.project.filter((doc) => doc.collection === activeProject && doc.kind !== 'idea'),
    ...visibleProject.filter(
      (doc) => doc.kind !== 'idea' && !ui.project.some((item) => item.id === doc.id),
    ),
  ]
  const projectSummary = (['poem', 'story', 'idea'] as const)
    .map((kind) => {
      const count = visibleProject.filter((doc) => doc.kind === kind).length
      return count
        ? `${count} ${count === 1 ? kindName(kind).toLowerCase() : plural(kind).toLowerCase()}`
        : ''
    })
    .filter(Boolean)
    .join(', ')
  const projectContextVisible = expanded && projectShown && !compact
  function projectNavigation() {
    return (
      <div className="mw-project-nav">
        <nav className="mw-panel-nav" aria-label="Workspace navigation">
          <button
            data-drawer-focus
            aria-current={ui.screen === 'library' ? 'page' : undefined}
            onClick={() => go('library')}
          >
            <Glyph name="library" />
            Library<span>{ui.docs.length}</span>
          </button>
          <button
            aria-current={ui.screen === 'project' ? 'page' : undefined}
            onClick={() => go('project')}
          >
            <Glyph name="project" />
            Projects
          </button>
        </nav>
        <div className="mw-project-name">
          <h2>
            <button title="Open project" onClick={() => go('project')}>
              {activeProject}
            </button>
          </h2>
          <p>{projectSummary}</p>
        </div>
        <div className="mw-nav-label">
          <h3>Writing</h3>
          <button
            title="Add writing"
            aria-label="Add project writing"
            onClick={() => ui.menu('new')}
          >
            <Glyph name="plus" />
          </button>
        </div>
        <div className="mw-file-list">
          {orderedWriting.map((doc, index) => (
            <button
              key={doc.id}
              title={doc.title}
              aria-label={`${doc.title}, ${kindName(doc.kind)}`}
              aria-current={ui.screen === 'editor' && ui.doc.id === doc.id ? 'page' : undefined}
              onClick={() => open(doc.id)}
            >
              <span className="mw-order">{index + 1}</span>
              <span>
                <strong>{doc.title}</strong>
                <small>{kindName(doc.kind)}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="mw-nav-label">
          <h3>Ideas &amp; research</h3>
          <button
            title="Add an idea"
            aria-label="New project idea"
            onClick={() => {
              setDrawer(null)
              ui.create('idea')
            }}
          >
            <Glyph name="plus" />
          </button>
        </div>
        <div className="mw-file-list mw-idea-list">
          {visibleProject
            .filter((doc) => doc.kind === 'idea')
            .map((doc) => (
              <button
                key={doc.id}
                title={doc.title}
                aria-label={doc.title}
                aria-current={ui.screen === 'editor' && ui.doc.id === doc.id ? 'page' : undefined}
                onClick={() => open(doc.id)}
              >
                <Glyph name="write" />
                <span>
                  <strong>{doc.title}</strong>
                </span>
              </button>
            ))}
        </div>
        <div className="mw-nav-bottom">
          <button
            onClick={() => {
              setDrawer(null)
              ui.menu('search')
            }}
          >
            <Glyph name="search" />
            Find writing<kbd>Ctrl K</kbd>
          </button>
          <button
            onClick={() => {
              setDrawer(null)
              ui.menu('backups')
            }}
          >
            <Glyph name="history" />
            Backups
          </button>
          <button
            onClick={() => {
              setDrawer(null)
              ui.menu('settings')
            }}
          >
            Writing preferences
          </button>
        </div>
      </div>
    )
  }
  const filtered = ui.filtered
  return (
    <div
      className={`mw-shell ${expanded ? 'mw-expanded' : 'mw-quiet'}`}
      data-appearance={appearance.value}
      data-compact={compact}
    >
      <span ref={sizeProbe} className="mw-size-probe" aria-hidden="true" />
      <header className="mw-header">
        <button className="mw-brand" aria-label="WR!TE library" onClick={() => go('library')}>
          WR!TE
        </button>
        <nav className="mw-header-nav" aria-label="Main navigation">
          <button
            aria-current={ui.screen === 'library' ? 'page' : undefined}
            onClick={() => go('library')}
          >
            Library
          </button>
          <button
            aria-current={ui.screen === 'editor' ? 'page' : undefined}
            onClick={() => go('editor')}
          >
            Writing
          </button>
          <button
            aria-current={ui.screen === 'project' ? 'page' : undefined}
            onClick={() => go('project')}
          >
            Projects
          </button>
        </nav>
        <div className="mw-header-controls">
          <div className="mw-view-switch" role="group" aria-label="Writing view">
            <button
              onMouseDown={keepDraftFocus}
              aria-pressed={!expanded}
              onClick={() => setWorkspace(false)}
            >
              Quiet
            </button>
            <button
              onMouseDown={keepDraftFocus}
              aria-pressed={expanded}
              onClick={() => setWorkspace(true)}
            >
              Workspace
            </button>
          </div>
          <button
            className="mw-mode-compact"
            onMouseDown={keepDraftFocus}
            aria-label={expanded ? 'Switch to Quiet view' : 'Expand Workspace'}
            onClick={() => setWorkspace(!expanded)}
          >
            {expanded ? 'Quiet view' : 'Workspace'}
          </button>
          <button
            className="mw-panel-toggle"
            title="Show or hide project navigation"
            aria-label="Project navigation"
            aria-expanded={drawer === 'project' || (expanded && projectShown && !compact)}
            onClick={toggleProject}
          >
            <Glyph name="project" />
            <span>Project</span>
          </button>
          <button
            className="mw-panel-toggle"
            title="Show or hide writing tools"
            aria-label="Writing tools"
            aria-expanded={drawer === 'tools' || (expanded && ui.tools && !compact)}
            onClick={toggleTools}
          >
            <Glyph name="tools" />
            <span>Tools</span>
          </button>
          <button
            ref={appearanceButton}
            className="mw-appearance"
            title="Choose appearance"
            aria-label={`Appearance: ${appearance.label}`}
            aria-haspopup="dialog"
            aria-expanded={appearanceOpen}
            popoverTarget="mw-appearance-picker"
            onMouseDown={keepDraftFocus}
          >
            <Glyph name={appearance.dark ? 'moon' : 'sun'} />
            <span>{appearance.label}</span>
            <svg
              className="mw-appearance-chevron"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </header>
      <div
        ref={appearanceRef}
        id="mw-appearance-picker"
        className="mw-appearance-picker"
        popover="auto"
        role="dialog"
        aria-label="Appearance"
        onToggle={() => {
          const open = Boolean(appearanceRef.current?.matches(':popover-open'))
          setAppearanceOpen(open)
          if (open) {
            positionAppearance()
            requestAnimationFrame(() =>
              appearanceRef.current
                ?.querySelector<HTMLInputElement>('input:checked')
                ?.focus({ preventScroll: true }),
            )
          }
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' ||
            ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
          )
            appearanceRef.current?.hidePopover()
        }}
      >
        <div className="mw-appearance-heading">
          <h2>Appearance</h2>
          <button
            aria-label="Close appearance picker"
            onClick={() => appearanceRef.current?.hidePopover()}
          >
            <Glyph name="close" />
          </button>
        </div>
        <fieldset>
          <legend>Colour scheme</legend>
          {appearanceOptions.map((option) => (
            <label
              className="mw-palette-option"
              key={option.value}
              onClick={(event) => {
                if (event.detail > 0)
                  requestAnimationFrame(() => appearanceRef.current?.hidePopover())
              }}
            >
              <input
                type="radio"
                name="writing-appearance"
                value={option.value}
                checked={appearance.value === option.value}
                onChange={() => route({ appearance: option.value })}
              />
              <span className="mw-palette-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <span className="mw-palette-swatches" aria-hidden="true">
                {['paper', 'ink', 'accent'].map((role) => (
                  <i key={role} style={{ background: `var(--swatch-${option.value}-${role})` }} />
                ))}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="mw-layout">
        <aside
          className="mw-project-panel"
          aria-label="Project documents"
          hidden={!expanded || !projectShown || compact}
        >
          {projectNavigation()}
        </aside>
        <main className="mw-content" ref={canvasRef}>
          {ui.screen === 'editor' ? (
            <>
              <article className="mw-manuscript">
                <div className="mw-document-context">
                  {projectContextVisible ? (
                    <span>{kindName(ui.doc.kind)}</span>
                  ) : (
                    <button onClick={() => go('project')}>{activeProject}</button>
                  )}
                  <div className="mw-document-state">
                    {!projectContextVisible && <span>{kindName(ui.doc.kind)}</span>}
                    <span>{ui.doc.status}</span>
                  </div>
                </div>
                <h1 className="mw-title-heading" aria-label={ui.doc.title || 'Untitled writing'}>
                  <textarea
                    ref={titleRef}
                    rows={1}
                    className="writing-title"
                    aria-label="Document title"
                    value={ui.doc.title}
                    onChange={(event) => ui.update({ title: event.target.value })}
                  />
                </h1>
                {writing}
                <footer className="mw-draft-footer">
                  <span>{ui.words} words</span>
                  <button onClick={() => ui.menu('checkpoint')}>Keep a version</button>
                </footer>
                <div className="mw-draft-actions">
                  <button onClick={() => ui.menu('comment')}>Comment</button>
                  <button onClick={() => ui.menu('history')}>History</button>
                  <button onClick={() => ui.menu('export')}>Export</button>
                </div>
              </article>
            </>
          ) : ui.screen === 'library' ? (
            <section className="mw-library">
              <div className="mw-section-head">
                <div>
                  <h1>Your writing</h1>
                  <p>Poems, stories, and the ideas between.</p>
                </div>
                <button className="mw-action" onClick={() => ui.menu('new')}>
                  <Glyph name="plus" />
                  New writing
                </button>
              </div>
              <div className="mw-library-controls">
                <div role="group" aria-label="Writing kind" className="mw-kind-tabs">
                  {(['all', 'poem', 'story', 'idea'] as const).map((kind) => (
                    <button
                      key={kind}
                      aria-pressed={ui.kind === kind}
                      onClick={() => ui.filter(kind)}
                    >
                      {kind === 'all' ? 'All' : plural(kind)}
                    </button>
                  ))}
                </div>
                <label className="mw-search">
                  <Glyph name="search" />
                  <input
                    aria-label="Search library"
                    value={ui.query}
                    onChange={(event) => ui.search(event.target.value)}
                    placeholder="Search writing"
                  />
                </label>
              </div>
              {!ui.query && ui.kind === 'all' && (
                <button className="mw-continue" onClick={() => open(ui.doc.id)}>
                  <span>Continue writing</span>
                  <strong>{ui.doc.title}</strong>
                  <Glyph name="arrow" />
                </button>
              )}
              <div className="mw-catalog-head">
                <span>Title</span>
                <span>Type</span>
                <span>Words</span>
                <span>Edited</span>
              </div>
              <div className="mw-catalog">
                {filtered.map((doc) => (
                  <button className="mw-catalog-row" key={doc.id} onClick={() => open(doc.id)}>
                    <span>
                      <strong>{doc.title}</strong>
                      <small>{doc.collection}</small>
                    </span>
                    <span>{kindName(doc.kind)}</span>
                    <span className="mw-number">{wordCount(doc.body)}</span>
                    <time>{doc.date}</time>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <div className="mw-empty">
                  <h2>No matching writing</h2>
                  <p>Try a different title or phrase, or clear the filters.</p>
                  <button
                    className="mw-action"
                    onClick={() => {
                      ui.filter('all')
                      ui.search('')
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <footer className="mw-library-footer">
                <span>
                  {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
                </span>
                <button onClick={() => ui.menu('import')}>Import writing</button>
              </footer>
            </section>
          ) : (
            <section className="mw-project-overview">
              <div className="mw-section-head">
                <div>
                  <h1>River notebook</h1>
                  <p>A story in chapters, with research kept close.</p>
                </div>
                <button className="mw-action" onClick={() => ui.create('story')}>
                  <Glyph name="plus" />
                  New chapter
                </button>
              </div>
              <div className="mw-project-tabs">
                <h2>Reading order</h2>
                <button onClick={() => ui.create('idea')}>Add an idea</button>
              </div>
              {outline}
              <section className="mw-research">
                <h2>Ideas & research</h2>
                {ui.docs
                  .filter((doc) => doc.kind === 'idea' && doc.collection === 'River notebook')
                  .map((doc) => (
                    <button key={doc.id} onClick={() => open(doc.id)}>
                      <strong>{doc.title}</strong>
                      <p>{doc.body.split('\n')[0]}</p>
                      <Glyph name="arrow" />
                    </button>
                  ))}
              </section>
            </section>
          )}
        </main>
        <aside
          className="mw-inspector"
          aria-label="Context panel"
          hidden={!expanded || !ui.tools || compact}
        >
          {ui.screen === 'editor' ? (
            tools(toggleTools)
          ) : (
            <div className="mw-project-context">
              <h2>River notebook</h2>
              <p>Keep the manuscript and its source material together.</p>
              <dl>
                <dt>Writing</dt>
                <dd>{ui.project.filter((doc) => doc.kind !== 'idea').length} pieces</dd>
                <dt>Research</dt>
                <dd>
                  {
                    ui.docs.filter(
                      (doc) => doc.kind === 'idea' && doc.collection === 'River notebook',
                    ).length
                  }{' '}
                  ideas
                </dd>
              </dl>
              <h3>To return to</h3>
              <p>
                The cup should return in the last scene. Let it do the work without explaining it.
              </p>
              <button className="mw-action" onClick={() => open('objects')}>
                Open the source idea
              </button>
            </div>
          )}
        </aside>
      </div>
      <dialog
        ref={drawerRef}
        className="mw-drawer"
        aria-label={drawer === 'project' ? 'Project navigation' : 'Writing tools'}
        onClose={() => setDrawer(null)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') setDrawer(null)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDrawer(null)
        }}
      >
        <div className="mw-drawer-inner">
          <div className="mw-drawer-head">
            <h2>{drawer === 'project' ? 'Workspace' : 'Writing tools'}</h2>
            <button aria-label="Close panel" onClick={() => setDrawer(null)}>
              <Glyph name="close" />
            </button>
          </div>
          <div className="mw-drawer-body">
            {drawer === 'project' ? projectNavigation() : tools(() => setDrawer(null))}
          </div>
        </div>
      </dialog>
    </div>
  )
}
