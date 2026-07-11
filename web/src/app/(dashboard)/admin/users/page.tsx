import { fetchAllUsers, fetchDivisions, fetchGroups } from '@/app/actions/admin'
import { getSessionUser } from '@/app/actions/auth'
import type { UserRole } from '@/types/database'
import UsersClient from './UsersClient'

const ADMIN_ROLES: UserRole[] = ['super_admin']

export default async function UsersPage() {
  const user = await getSessionUser()

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">🚫</div>
        <h2 className="text-lg font-semibold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ Super Admin)</h2>
      </div>
    )
  }

  const isSuperAdmin = true
  const userDivisionId = user.division_id

  const users = await fetchAllUsers()
  const divisions = await fetchDivisions()
  const groups = await fetchGroups()

  return (
    <UsersClient
      users={users || []}
      divisions={divisions || []}
      groups={groups || []}
      isSuperAdmin={isSuperAdmin}
      currentDivisionId={userDivisionId ?? null}
    />
  )
}
