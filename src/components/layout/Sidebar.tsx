import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Briefcase,
  SquareKanban,
  GitMerge,
  Users,
  Package,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'

// ─── Nav group config ─────────────────────────────────────────────────────────
const WORKSPACE_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/standups',  label: 'Daily Standups', icon: ClipboardList   },
]

const OPERATIONS_ITEMS = [
  { to: '/projects',  label: 'Projects',    icon: Briefcase    },
  { to: '/tasks',     label: 'Task Board',  icon: SquareKanban },
]

const PIPELINE_ITEMS = [
  { to: '/pipeline',  label: 'As-Is Studies', icon: GitMerge },
]

const SETTINGS_ITEMS = [
  { to: '/team',      label: 'Team',      icon: Users   },
  { to: '/templates', label: 'Templates', icon: Package },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-800'
  )

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-slate-500 select-none">
        {label}
      </p>
      {children}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col border-r border-slate-800">

      {/* ── Brand ── */}
      <div className="px-6 py-5 border-b border-slate-800">
        <span className="text-white font-bold text-base tracking-tight">JNH Systems</span>
        <p className="text-slate-500 text-xs mt-0.5 font-medium">Internal Ops Platform</p>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto" aria-label="Main navigation">

        <NavGroup label="Workspace">
          {WORKSPACE_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin/weekly-summary" className={linkClass}>
              <FileText size={16} strokeWidth={2} />
              Weekly Summary
            </NavLink>
          )}
        </NavGroup>

        <NavGroup label="Operations">
          {OPERATIONS_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </NavGroup>

        <NavGroup label="Pipeline">
          {PIPELINE_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </NavGroup>

        <NavGroup label="Settings">
          {SETTINGS_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <ShieldCheck size={16} strokeWidth={2} />
              Admin
            </NavLink>
          )}
        </NavGroup>

      </nav>

      {/* ── User footer ── */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <LogOut size={16} strokeWidth={2} />
          Sign out
        </button>
      </div>

    </aside>
  )
}
