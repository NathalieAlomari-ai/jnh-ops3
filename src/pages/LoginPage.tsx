import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Zap, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ─── Inline JNH logo mark ─────────────────────────────────────────────────────
function JNHMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #007bff 0%, #0cc0df 100%)',
        boxShadow: '0 4px 16px rgba(0,123,255,0.35)',
      }}
    >
      <img
        src="/favicon.svg"
        alt="JNH Systems Logo"
        style={{ width: size * 0.58, height: size * 0.58, filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
      />
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label, type, value, onChange, placeholder, icon: Icon,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: React.ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>
        {label}
      </label>
      <div className="relative">
        <Icon
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--t3)' }}
        />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
          style={{
            border: '1.5px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--t1)',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { user, signIn, signInWithMagicLink, loading } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')
  const [pending, setPending]   = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f5fb' }}>
        <div className="w-6 h-6 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSignIn(e: React.MouseEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setError(''); setMessage(''); setPending(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setPending(false)
  }

  async function handleMagicLink(e: React.MouseEvent) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first.'); return }
    setError(''); setMessage(''); setPending(true)
    const { error } = await signInWithMagicLink(email)
    if (error) setError(error.message)
    else setMessage('Magic link sent — check your inbox.')
    setPending(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: '#f0f5fb' }}
    >
      {/* ── Background blobs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600,
            top: -180, right: -120,
            background: 'radial-gradient(circle, rgba(0,123,255,0.10) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500,
            bottom: -150, left: -100,
            background: 'radial-gradient(circle, rgba(12,192,223,0.09) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 300, height: 300,
            top: '40%', left: '40%',
            background: 'radial-gradient(circle, rgba(43,112,228,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Card ── */}
      <div
        className="relative w-full max-w-[420px]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: '0 8px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full rounded-t-[20px]"
          style={{ background: 'linear-gradient(90deg, #007bff 0%, #0cc0df 100%)' }}
        />

        <div className="px-8 pt-8 pb-9 space-y-6">

          {/* ── Brand ── */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <JNHMark size={48} />
            <div className="text-center">
              <h1
                className="text-[22px] font-bold tracking-tight"
                style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}
              >
                JNH Systems
              </h1>
              <p className="text-[13px] mt-0.5 font-medium" style={{ color: 'var(--t3)' }}>
                Internal Ops Platform
              </p>
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* ── Heading ── */}
          <div>
            <h2
              className="text-[18px] font-bold"
              style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}
            >
              Sign in to your account
            </h2>
            <p className="text-[13px] mt-1" style={{ color: 'var(--t2)' }}>
              Welcome back — enter your credentials below.
            </p>
          </div>

          {/* ── Fields ── */}
          <div className="space-y-4">
            <Field label="Email address" type="email" value={email}
              onChange={setEmail} placeholder="you@jnhsystems.com" icon={Mail} />
            <Field label="Password" type="password" value={password}
              onChange={setPassword} placeholder="••••••••" icon={Lock} />
          </div>

          {/* ── Alerts ── */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-[13px] font-medium flex items-start gap-2"
              style={{ background: '#fff5f5', border: '1px solid #fecaca', color: '#b91c1c' }}
            >
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div
              className="px-4 py-3 rounded-xl text-[13px] font-medium flex items-start gap-2"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}
            >
              <span className="mt-0.5 flex-shrink-0">✓</span>
              <span>{message}</span>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="space-y-3">

            {/* Primary sign-in */}
            <button
              onClick={handleSignIn}
              disabled={pending}
              className="w-full py-3 rounded-xl font-bold text-white text-[14px] flex items-center justify-center gap-2 transition-all btn-brand"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>
                or
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {/* Magic link */}
            <button
              onClick={handleMagicLink}
              disabled={pending}
              className="w-full py-3 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'var(--surface-2)',
                border: '1.5px solid var(--border)',
                color: 'var(--t2)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--blue)'
                el.style.color = 'var(--blue)'
                el.style.background = 'rgba(0,123,255,0.04)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--border)'
                el.style.color = 'var(--t2)'
                el.style.background = 'var(--surface-2)'
              }}
            >
              <Zap size={14} />
              Send Magic Link
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[12px]" style={{ color: 'var(--t3)' }}>
            Restricted to JNH Systems team members
          </p>
        </div>
      </div>
    </div>
  )
}
