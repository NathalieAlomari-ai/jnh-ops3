import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useProfiles, useUpdateProfile } from '@/hooks/useProfiles'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Profile } from '@/types/database'

// ─── Edit form (Admin only) ───────────────────────────────────────────────────
function ProfileForm({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const updateProfile = useUpdateProfile()
  const [form, setForm] = useState({
    full_name:       profile.full_name,
    job_title:       profile.job_title       ?? '',
    department:      profile.department      ?? '',
    avatar_url:      profile.avatar_url      ?? '',
    phone:           profile.phone           ?? '',
    whatsapp_number: profile.whatsapp_number ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await updateProfile.mutateAsync({ id: profile.id, updates: form })
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'

  const fields: { key: keyof typeof form; label: string; placeholder?: string }[] = [
    { key: 'full_name',       label: 'Full Name' },
    { key: 'job_title',       label: 'Job Title' },
    { key: 'department',      label: 'Department' },
    { key: 'avatar_url',      label: 'Avatar URL', placeholder: 'https://…' },
    { key: 'phone',           label: 'Phone' },
    { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+9661234567890' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            {label}
          </label>
          <input
            className={inputCls}
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder ?? ''}
          />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { data: profiles, isLoading } = useProfiles()
  const { isAdmin } = useAuth()                    // only isAdmin needed — no self-edit
  const [editing, setEditing] = useState<Profile | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin ? 'Manage team member profiles' : 'Team directory'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles?.map(p => (
            <Card key={p.id}>
              <CardBody className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg flex-shrink-0 overflow-hidden">
                  {p.avatar_url
                    ? <img src={p.avatar_url} className="w-12 h-12 object-cover" alt="" />
                    : p.full_name.charAt(0).toUpperCase()
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{p.full_name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{p.job_title ?? '—'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{p.department ?? '—'}</p>
                    </div>

                    {/* Edit button — admins only */}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(p)}
                        aria-label={`Edit ${p.full_name}`}
                      >
                        <Pencil size={14} />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    <Badge variant={p.role === 'admin' ? 'purple' : 'gray'}>{p.role}</Badge>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Edit modal — admins only (double guard) */}
      {isAdmin && editing && (
        <Modal open title={`Edit Profile — ${editing.full_name}`} onClose={() => setEditing(null)}>
          <ProfileForm profile={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
