import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { navigationItems } from './navigationItems'
import { IconButton } from '../ui/IconButton'

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-[#fbfcf9] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[72px] items-center justify-between px-6">
          <NavLink to="/" className="flex items-center gap-3" onClick={onClose}>
            <span className="grid size-9 place-items-center rounded-xl bg-[#173a32] text-sm font-bold text-white">D</span>
            <span className="text-[17px] font-bold tracking-[0.12em] text-slate-900">DAYTRACK</span>
          </NavLink>
          <IconButton label="Close menu" className="lg:hidden" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-[10px] text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'bg-[#e8f0ec] text-[#173a32]'
                          : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="m-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[#dbe8df] text-sm font-semibold text-[#173a32]">D</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">Local workspace</p>
              <p className="truncate text-xs text-slate-400">Development mode</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
