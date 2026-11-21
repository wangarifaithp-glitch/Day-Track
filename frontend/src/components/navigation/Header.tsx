import { Moon, Plus, Search, Sun, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { IconButton } from '../ui/IconButton'
import { NotificationCenter } from './NotificationCenter'
import { navigationItems } from './navigationItems'
import { useAppearance } from '../../layouts/AppLayout'

type HeaderProps = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const { profile } = useAppearance()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f7f8f5]/95 backdrop-blur">
      <div className="flex h-[72px] items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link
            to="/profile"
            aria-label="Your profile"
            title="Your profile"
            className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8f0ec] text-[#173a32] ring-1 ring-slate-200 transition hover:ring-emerald-600"
          >
            {profile.photo ? (
              <img src={profile.photo} alt="" className="size-full object-cover" />
            ) : (
              <UserRound size={18} />
            )}
          </Link>
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#173a32] text-sm font-bold text-white">D</span>
            <span className="hidden text-[17px] font-bold tracking-[0.12em] text-slate-900 sm:inline">DAYTRACK</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400 lg:flex lg:w-64">
            <Search size={16} />
            <span className="text-sm">Search your day</span>
            <kbd className="ml-auto rounded border border-slate-200 px-1.5 text-[10px] text-slate-400">⌘ K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={onToggleTheme}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </IconButton>
          <NotificationCenter />
          <Link
            to="/timeline?log=1"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173a32] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d473d] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Log activity</span>
          </Link>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="overflow-x-auto border-t border-slate-200/60 px-3 md:px-8">
        <div className="flex h-12 min-w-max items-center gap-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#e8f0ec] text-[#173a32]'
                      : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
