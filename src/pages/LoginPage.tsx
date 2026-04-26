import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Zap, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ─── JNH logo mark ───────────────────────────────────────────────────────────
function JNHMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
        boxShadow: '0 4px 20px rgba(37,99,235,0.30)',
      }}
    >
      <img
        src="/favicon.svg"
        alt="JNH Systems Logo"
        style={{
          width: size * 0.55,
          height: size * 0.55,
          filter: 'brightness(0) invert(1)',
          objectFit: 'contain',
        }}
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
      <label className="block text-[12.5px] font-semibold" style={{ color: 'var(--t2)' }}>
        {label}
      </label>
      <div className="relative">
        <Icon
          size={13}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--t3)' }}
        />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-[13px] transition-all"
          style={{
            border: '1px solid var(--border)',
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
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
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* ── Background blobs — navy blue tones ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600,
            top: -200, right: -140,
            background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500,
            bottom: -160, left: -100,
            background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Card ── */}
      <div
        className="relative w-full max-w-[400px]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Blue accent bar */}
        <div
          className="h-[3px] w-full rounded-t-[16px]"
          style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)' }}
        />

        <div className="px-8 pt-8 pb-9 space-y-6">

          {/* ── Brand ── */}
          <div className="flex flex-col items-center gap-3 pb-1">
            <JNHMark size={46} />
            <div className="text-center">
              <h1
                className="text-[21px] font-bold tracking-tight"
                style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}
              >
                JNH Systems
              </h1>
              <p className="text-[12.5px] mt-0.5 font-medium" style={{ color: 'var(--t3)' }}>
                Internal Ops Platform
              </p>
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* ── Heading ── */}
          <div>
            <h2
              className="text-[16px] font-semibold"
              style={{ color: 'var(--t1)', fontFamily: 'var(--font-display)' }}
            >
              Sign in to your account
            </h2>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--t3)' }}>
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
              className="px-4 py-3 rounded-lg text-[12.5px] font-medium flex items-start gap-2"
              style={{ background: '#fff5f5', border: '1px solid #fecaca', color: '#b91c1c' }}
            >
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div
              className="px-4 py-3 rounded-lg text-[12.5px] font-medium flex items-start gap-2"
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
              className="w-full py-2.5 rounded-lg font-semibold text-white text-[13.5px] flex items-center justify-center gap-2 transition-all btn-brand cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>Sign In <ArrowRight size={14} /></>
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
              className="w-full py-2.5 rounded-lg font-medium text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--t2)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--orange)'
                el.style.color = 'var(--orange)'
                el.style.background = 'rgba(37,99,235,0.04)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--border)'
                el.style.color = 'var(--t2)'
                el.style.background = 'var(--surface-2)'
              }}
            >
              <Zap size={13} />
              Send Magic Link
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[11.5px]" style={{ color: 'var(--t3)' }}>
            Restricted to JNH Systems team members
          </p>
        </div>
      </div>
    </div>
  )
}
