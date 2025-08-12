import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import Logo from './Logo'

const link = ({ isActive }) =>
  'px-3 py-2 rounded-xl text-sm font-medium ' +
  (isActive ? 'bg-brand.water/20 text-brand.heron' : 'text-foreground hover:bg-brand.water/10')

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-black/5">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <span className="font-semibold tracking-wide text-brand.heron">
            Be Still Crossville
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink to="/" className={link} end>Home</NavLink>
          <NavLink to="/tours" className={link}>Tours</NavLink>
          <NavLink to="/about" className={link}>About</NavLink>
        </nav>
      </div>
    </header>
  )
}
