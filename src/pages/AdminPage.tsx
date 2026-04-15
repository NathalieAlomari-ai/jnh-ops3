import { useState } from 'react'
import { Shield, ShieldCheck, Loader2 } from 'lucide-react'
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
    if (toggling) return
    setToggling(id)

    // Optimistic: flip the badge immediately in the list
    // (useUpdateProfile already patches the cache, but we guard double-clicks here)
    await updateProfile.mutateAsync({
      id,
      updates: { role: current === 'admin' ? 'user' : 'admin' },
    }).finally(() => setToggling(null))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage team member roles and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900 dark:text-white">User Management</h2>
        </CardHeader>
        {isLoading ? (
          <CardBody>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800 dark:divide-slate-800">
            {profiles?.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm flex-shrink-0">
                  {p.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{p.full_name}</p>
                  <p className="text-sm text-slate-400">{p.email}</p>
                </div>
                {/* Badge updates optimistically via useUpdateProfile */}
                <Badge variant={p.role === 'admin' ? 'purple' : 'gray'}>{p.role}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={toggling === p.id}
                  onClick={() => toggleRole(p.id, p.role)}
                >
                  {toggling === p.id
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : p.role === 'admin'
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
          <h2 className="font-semibold text-slate-900 dark:text-white">Invite New User</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            To invite a new team member, go to your{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              Supabase Dashboard → Authentication → Users → Invite user
            </strong>.
            They will receive a magic link email. Their profile will be created automatically with the{' '}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 dark:text-slate-300 px-1 py-0.5 rounded">
              user
            </code>{' '}
            role.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
