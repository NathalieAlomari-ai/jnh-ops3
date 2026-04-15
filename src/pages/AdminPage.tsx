import { useState } from 'react'
import { Shield, ShieldCheck } from 'lucide-react'
import { useProfiles, useUpdateProfile } from '@/hooks/useProfiles'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { UserRole } from '@/types/database'

export default function AdminPage() {
  const { data: profiles, isLoading } = useProfiles()
  const updateProfile = useUpdateProfile()
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggleRole(id: string, current: UserRole) {
    setToggling(id)
    await updateProfile.mutateAsync({
      id,
      updates: { role: current === 'admin' ? 'user' : 'admin' },
    })
    setToggling(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Manage team member roles and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">User Management</h2>
        </CardHeader>
        {isLoading ? (
          <CardBody><p className="text-gray-400 text-sm">Loading…</p></CardBody>
        ) : (
          <div className="divide-y divide-gray-50">
            {profiles?.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                  {p.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{p.full_name}</p>
                  <p className="text-sm text-gray-400">{p.email}</p>
                </div>
                <Badge variant={p.role === 'admin' ? 'purple' : 'gray'}>{p.role}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={toggling === p.id}
                  onClick={() => toggleRole(p.id, p.role)}
                >
                  {p.role === 'admin'
                    ? <><Shield size={14} /> Demote to User</>
                    : <><ShieldCheck size={14} /> Promote to Admin</>
                  }
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Invite New User</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-500">
            To invite a new team member, go to your{' '}
            <strong>Supabase Dashboard → Authentication → Users → Invite user</strong>.
            They will receive a magic link email. Their profile will be created automatically with the <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">user</code> role.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
