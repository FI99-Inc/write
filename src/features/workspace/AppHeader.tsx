import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AppearancePicker } from './AppearancePicker'

export function AppHeader({
  writing = false,
  children,
}: {
  writing?: boolean
  children?: ReactNode
}) {
  return (
    <header className="wr-header" data-writing={writing}>
      <Link className="wr-brand" to="/" aria-label="WR!TE library">
        WR!TE
      </Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>
          Library
        </NavLink>
        {writing && <span aria-current="page">Writing</span>}
        <NavLink to="/projects">Projects</NavLink>
      </nav>
      <div className="wr-header-controls">
        {children}
        <AppearancePicker />
      </div>
    </header>
  )
}
