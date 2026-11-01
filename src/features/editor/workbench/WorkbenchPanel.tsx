import { useId, type ReactNode } from 'react'
interface WorkbenchTab {
  id: string
  label: string
}
interface WorkbenchPanelProps {
  tabs: readonly WorkbenchTab[]
  activeTab: string
  onTabChange: (id: string) => void
  hidden?: boolean
  onClose: () => void
  children: ReactNode
}
export function WorkbenchPanel({
  tabs,
  activeTab,
  onTabChange,
  hidden,
  onClose,
  children,
}: WorkbenchPanelProps) {
  const id = useId()
  return (
    <aside
      aria-label="Writing workbench"
      className="wr-workbench"
      hidden={hidden}
    >
      <div className="wr-workbench-heading">
        <h2>Writing tools</h2>
        <button
          type="button"
          aria-label="Close workbench panel"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div role="tablist" aria-label="Writing tools" className="wr-tool-tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${id}-${tab.id}`}
            aria-controls={`${id}-panel`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => {
              let next = index
              if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
              else if (event.key === 'ArrowLeft')
                next = (index + tabs.length - 1) % tabs.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = tabs.length - 1
              else return
              event.preventDefault()
              onTabChange(tabs[next].id)
              document.getElementById(`${id}-${tabs[next].id}`)?.focus()
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${activeTab}`}
        tabIndex={0}
        className="wr-tool-content"
      >
        {children}
      </div>
    </aside>
  )
}
