import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useProfiles, useUpdateProfile } from '@/hooks/useProfiles'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Profile } from '@/types/database'

function ProfileForm({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const updateProfile = useUpdateProfile()
  const [form, setForm] = useState({
    full_name: profile.full_name,
    job_title: profile.job_title ?? '',
    department: profile.department ?? '',
    avatar_url: profile.avatar_url ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await updateProfile.mutateAsync({ id: profile.id, updates: form })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(['full_name', 'job_title', 'department', 'avatar_url'] as const).map(field => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
            {field.replace('_', ' ')}
          </label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form[field]}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            placeholder={field === 'avatar_url' ? 'https://...' : ''}
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

export default function TeamPage() {
  const { data: profiles, isLoading } = useProfiles()
  const { profile: me, isAdmin } = useAuth()
  const [editing, setEditing] = useState<Profile | null>(null)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Team</h1>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles?.map(p => (
            <Card key={p.id}>
              <CardBody className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">
                  {p.avatar_url
                    ? <img src={p.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                    : p.full_name.charAt(0).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{p.full_name}</p>
                      <p className="text-sm text-gray-500">{p.job_title ?? '—'}</p>
                      <p className="text-xs text-gray-400">{p.department ?? '—'}</p>
                    </div>
                    {(isAdmin || p.id === me?.id) && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
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

      {editing && (
        <Modal open title={`Edit Profile — ${editing.full_name}`} onClose={() => setEditing(null)}>
          <ProfileForm profile={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
