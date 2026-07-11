import { fetchAllUsers, fetchDivisions, fetchGroups } from '@/app/actions/admin'
import { createClient } from '@/utils/supabase/server'
import AdminClient from './AdminClient'
import { getSessionUser } from '@/app/actions/auth'
import type { UserRole } from '@/types/database'

const ADMIN_ROLES: UserRole[] = ['super_admin', 'sub_admin']

export default async function AdminDashboard() {
  const user = await getSessionUser()

  // ตรวจสอบสิทธิ์ admin
  if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">🚫</div>
        <h2 className="text-lg font-semibold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-gray-500 mt-1">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    )
  }

  const isSuperAdmin = user.role === 'super_admin'
  const userDivisionId = user.division_id

  // super_admin: ดูทุกกอง / sub_admin: ดูเฉพาะกองตัวเอง
  const users = await fetchAllUsers(isSuperAdmin ? undefined : userDivisionId ?? undefined)
  const divisions = await fetchDivisions(isSuperAdmin ? undefined : userDivisionId ?? undefined)

  const supabase = await createClient()
  
  let routesQuery = supabase.from('approval_routes').select('*').order('step_order')
  if (!isSuperAdmin && userDivisionId) {
    routesQuery = routesQuery.eq('division_id', userDivisionId)
  }
  const { data: allRoutes } = await routesQuery

  const allGroups = await fetchGroups(isSuperAdmin ? undefined : userDivisionId ?? undefined)

  return (
    <AdminClient
      users={users || []}
      divisions={divisions || []}
      groups={allGroups || []}
      allRoutes={allRoutes || []}
      isSuperAdmin={isSuperAdmin}
      currentUserDivisionId={userDivisionId ?? null}
    />
  )
}
