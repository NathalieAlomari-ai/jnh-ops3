import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, FileText, Briefcase,
  SquareKanban, GitMerge, Users, ShieldCheck, LogOut,
  Sun, Moon, CalendarDays, BarChart3,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'

// ─── Logo mark (uses the real favicon.svg) ────────────────────────────────────
function LogoMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #007bff 0%, #0cc0df 100%)' }}>
        <img
          src="/favicon.svg"
          alt="JNH Systems Logo"
          className="w-5 h-5 object-contain brightness-0 invert"
        />
      </div>
      <div>
        <p className="text-white font-bold text-[14px] leading-none tracking-tight"
           style={{ fontFamily: 'var(--font-display)' }}>
          JNH Systems
        </p>
        <p className="text-[11px] leading-none mt-0.5" style={{ color: 'var(--sb-text)' }}>
          Ops Platform
        </p>
      </div>
    </div>
  )
}

// ─── Nav link ────────────────────────────────────────────────────────────────
function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) =>
        isActive
          ? {
              color: 'var(--sb-text-active)',
              background: 'var(--sb-active-bg)',
              borderLeft: '2.5px solid var(--sb-active-bar)',
              paddingLeft: 'calc(0.75rem - 2.5px)',
            }
          : { color: 'var(--sb-text)', borderLeft: '2.5px solid transparent' }
      }
      className={({ isActive }) => [
        'group flex items-center gap-2.5 py-[9px] pr-3 rounded-r-lg text-[13px] font-medium',
        'transition-all duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20',
        'pl-[calc(0.75rem-2.5px)]',
        !isActive && 'hover:bg-[var(--sb-hover)] hover:text-[#cccccc]',
      ].filter(Boolean).join(' ')}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={15}
            strokeWidth={isActive ? 2.2 : 1.8}
            className="flex-shrink-0 transition-colors"
            style={{ color: isActive ? '#007bff' : 'currentColor' }}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-[0.10em] select-none"
       style={{ color: 'var(--sb-label)' }}>
      {label}
    </p>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <aside
      className="w-[220px] min-h-screen flex flex-col flex-shrink-0 overflow-hidden"
      style={{ backgroundColor: 'var(--sb-bg)' }}
    >
      {/* ── Brand ── */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--sb-divider)' }}>
        <LogoMark />
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 py-2 overflow-y-auto" aria-label="Main navigation">

        <SectionLabel label="Workspace" />
        <NavItem to="/dashboard"      label="Dashboard"        icon={LayoutDashboard} />
        <NavItem to="/standups"       label="Daily Standups"   icon={ClipboardList}   />
        <NavItem to="/meetings"       label="Meeting Schedule" icon={CalendarDays}    />
        <NavItem to="/weekly-summary"  label="Weekly Summary"   icon={FileText}        />
        <NavItem to="/monthly-report" label="Monthly Report"   icon={BarChart3}       />

        <SectionLabel label="Operations" />
        <NavItem to="/projects" label="Projects"   icon={Briefcase}    />
        <NavItem to="/tasks"    label="Task Board" icon={SquareKanban} />

        <SectionLabel label="Pipeline" />
        <NavItem to="/pipeline" label="As-Is Studies" icon={GitMerge} />

        <SectionLabel label="Settings" />
        <NavItem to="/team" label="Team" icon={Users} />
        {isAdmin && <NavItem to="/admin" label="Admin" icon={ShieldCheck} />}

      </nav>

      {/* ── Footer ── */}
      <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid var(--sb-divider)' }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all
                     focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          style={{ color: 'var(--sb-text)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover)'; (e.currentTarget as HTMLElement).style.color = '#ccc' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--sb-text)' }}
        >
          {theme === 'dark'
            ? <Sun size={14} strokeWidth={2} />
            : <Moon size={14} strokeWidth={2} />
          }
          <span className="flex-1 text-left">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          {/* pill */}
          <div className="relative w-7 h-3.5 rounded-full flex-shrink-0 transition-colors"
               style={{ background: theme === 'dark' ? 'var(--blue)' : '#484848' }}>
            <div className="absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all duration-200"
                 style={{ left: theme === 'dark' ? 'calc(100% - 11px)' : '2px' }} />
          </div>
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
             style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center
                          text-white text-[11px] font-bold"
               style={{ background: 'var(--g-brand)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-white truncate leading-snug">
              {profile?.full_name ?? '…'}
            </p>
            <p className="text-[11px] capitalize leading-snug" style={{ color: 'var(--sb-text)' }}>
              {profile?.role ?? 'user'}
            </p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="flex-shrink-0 p-1 rounded-md transition-colors"
            style={{ color: 'var(--sb-text)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff6b6b' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sb-text)' }}
          >
            <LogOut size={13} strokeWidth={2} />
          </button>
        </div>

      </div>
    </aside>
  )
}
