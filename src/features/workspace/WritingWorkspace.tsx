import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '@/engines/useSettings'
import type { DocKind } from '@/types/libraryDoc'
import { AppHeader } from './AppHeader'
import { Glyph } from './Glyph'
import { ProjectRail } from './ProjectRail'

function WorkspacePanel({
  label,
  compact,
  shown,
  onClose,
  children,
}: {
  label: string
  compact: boolean
  shown: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    // Declarative non-modal panels must never take focus from the draft.
    // Only phone drawers enter the top layer and receive native focus handling.
    if (compact) {
      if (node.open && !node.matches(':modal')) node.close()
      if (shown && !node.open) node.showModal()
      else if (!shown && node.open) node.close()
    } else {
      if (node.matches(':modal')) node.close()
      node.open = shown
    }
  }, [shown, compact])
  return (
    <dialog
      ref={ref}
      className={`wr-panel wr-panel-${label.toLowerCase()}`}
      role={compact ? 'dialog' : 'presentation'}
      aria-label={compact ? label : undefined}
      aria-modal={compact && shown ? true : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (!compact || event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose()
      }}
    >
      {label === 'Project' && (
        <div className="wr-panel-heading">
          <h2>Project</h2>
          <button
            type="button"
            aria-label="Close project panel"
            onClick={onClose}
          >
            <Glyph name="close" />
          </button>
        </div>
      )}
      {children}
    </dialog>
  )
}

/** Presentation changes never move or recreate the manuscript subtree. */
export function WritingWorkspace({
  documentId,
  actions,
  before,
  children,
  tools,
  toolsRequest = 0,
}: {
  documentId: string
  actions: ReactNode
  before?: ReactNode
  children: ReactNode
  tools: (hidden: boolean, close: () => void) => ReactNode
  toolsRequest?: number
}) {
  const { settings, updateSettings } = useSettings()
  const [compact, setCompact] = useState(() => window.innerWidth < 1160)
  type Drawer = 'project' | 'tools' | null
  const [presentation, setPresentation] = useState({
    compact,
    documentId,
    request: toolsRequest,
    panel: null as Drawer,
  })
  const drawer =
    presentation.compact !== compact || presentation.documentId !== documentId
      ? null
      : presentation.request !== toolsRequest
        ? compact
          ? 'tools'
          : null
        : presentation.panel
  const setDrawer = useCallback(
    (panel: Drawer) => {
      setPresentation({ compact, documentId, request: toolsRequest, panel })
    },
    [compact, documentId, toolsRequest],
  )
  const closeDrawer = useCallback(() => setDrawer(null), [setDrawer])
  const probe = useRef<HTMLSpanElement>(null)
  const previousRequest = useRef(toolsRequest)
  const shell = useRef<HTMLDivElement>(null)
  const workspace = settings.workspaceMode === 'workspace'
  useLayoutEffect(() => {
    const node = probe.current
    if (!node) return
    const update = () =>
      setCompact(window.innerWidth < node.getBoundingClientRect().width * 72.5)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  useEffect(() => {
    if (toolsRequest === previousRequest.current) return
    previousRequest.current = toolsRequest
    updateSettings({ workspaceMode: 'workspace', toolsPanelOpen: true })
  }, [toolsRequest, updateSettings])
  const projectShown = compact
    ? drawer === 'project'
    : workspace && settings.projectPanelOpen
  const toolsShown = compact
    ? drawer === 'tools'
    : workspace && settings.toolsPanelOpen
  function mode(next: 'quiet' | 'workspace') {
    setDrawer(null)
    updateSettings({ workspaceMode: next })
  }
  function toggle(panel: 'project' | 'tools') {
    if (compact) setDrawer(drawer === panel ? null : panel)
    else
      updateSettings({
        workspaceMode: 'workspace',
        ...(panel === 'project'
          ? { projectPanelOpen: !projectShown }
          : { toolsPanelOpen: !toolsShown }),
      })
  }
  function keepDraftFocus(event: PointerEvent<HTMLButtonElement>) {
    if (compact && event.currentTarget.classList.contains('wr-panel-toggle'))
      return
    const active = document.activeElement
    if (
      event.pointerType === 'mouse' &&
      active instanceof HTMLElement &&
      shell.current?.contains(active) &&
      (active.matches('textarea') || active.isContentEditable)
    )
      event.preventDefault()
  }
  const closeTools = () => {
    if (compact) setDrawer(null)
    else updateSettings({ toolsPanelOpen: false })
  }
  return (
    <div
      ref={shell}
      className="wr-workspace print:hidden"
      data-compact={compact}
      data-mode={settings.workspaceMode}
    >
      <span className="wr-size-probe" ref={probe} aria-hidden="true" />
      <AppHeader writing>
        <div className="wr-view-switch" aria-label="Writing view">
          <button
            type="button"
            aria-pressed={!workspace}
            onPointerDown={keepDraftFocus}
            onClick={() => mode('quiet')}
          >
            Quiet
          </button>
          <button
            type="button"
            aria-pressed={workspace}
            onPointerDown={keepDraftFocus}
            onClick={() => mode('workspace')}
          >
            Workspace
          </button>
        </div>
        <button
          type="button"
          className="wr-mode-compact"
          aria-label={
            workspace ? 'Switch to Quiet view' : 'Switch to Workspace view'
          }
          onPointerDown={keepDraftFocus}
          onClick={() => mode(workspace ? 'quiet' : 'workspace')}
        >
          {workspace ? 'Quiet view' : 'Workspace'}
        </button>
        <button
          type="button"
          className="wr-panel-toggle"
          aria-label="Project"
          aria-expanded={projectShown}
          onPointerDown={keepDraftFocus}
          onClick={() => toggle('project')}
        >
          <Glyph name="project" />
          <span>Project</span>
        </button>
        <button
          type="button"
          className="wr-panel-toggle"
          aria-label="Tools"
          aria-expanded={toolsShown}
          onPointerDown={keepDraftFocus}
          onClick={() => toggle('tools')}
        >
          <Glyph name="tools" />
          <span>Tools</span>
        </button>
      </AppHeader>
      <div className="wr-workspace-body">
        <WorkspacePanel
          label="Project"
          compact={compact}
          shown={projectShown}
          onClose={() =>
            compact
              ? setDrawer(null)
              : updateSettings({ projectPanelOpen: false })
          }
        >
          <ProjectRail documentId={documentId} onNavigate={closeDrawer} />
        </WorkspacePanel>
        <section className="wr-editor-center" aria-label="Manuscript">
          <details className="wr-document-actions" open={workspace && !compact}>
            <summary>Document actions</summary>
            <div className="wr-editor-actions">{actions}</div>
          </details>
          {before}
          {children}
        </section>
        <WorkspacePanel
          label="Tools"
          compact={compact}
          shown={toolsShown}
          onClose={closeTools}
        >
          {tools(!toolsShown, closeTools)}
        </WorkspacePanel>
      </div>
    </div>
  )
}

export function DocumentLabel({
  kind,
  status,
  sourceIdeaId,
  children,
}: {
  kind: DocKind
  status?: string
  sourceIdeaId?: string
  children?: ReactNode
}) {
  return (
    <div className="wr-document-label">
      <span>
        {kind === 'idea' ? 'Idea' : kind === 'poem' ? 'Poem' : 'Story'}
        {status && <span>{status}</span>}
      </span>
      {children}
      {sourceIdeaId && (
        <Link to={`/idea/${sourceIdeaId}`}>Source Idea and notes</Link>
      )}
    </div>
  )
}
