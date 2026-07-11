import { getSessionUser } from '@/app/actions/auth'
import { fetchApprovedRequests, fetchOTDocuments } from '@/app/actions/admin'
import { createClient } from '@/utils/supabase/server'
import DocumentClient from './DocumentClient'
import type { UserRole } from '@/types/database'

import { format } from 'date-fns'

const ADMIN_ROLES: UserRole[] = ['super_admin', 'sub_admin']

export default async function DocumentsPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const user = await getSessionUser()

  if (!user || !ADMIN_ROLES.includes(user.role as UserRole)) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">🚫</div>
        <h2 className="text-lg font-semibold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
      </div>
    )
  }

  // sub_admin see only their division, super_admin can see all (but for now let's default to user's division)
  // Actually, super_admin should select a division first. To simplify, we use the user's division.
  // If super_admin, we might need a division selector. For this iteration, we pass userDivisionId.
  const userDivisionId = user.division_id

  if (!userDivisionId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">ไม่พบข้อมูลกองของคุณ</h2>
      </div>
    )
  }

  const monthQuery = (typeof searchParams.month === 'string' ? searchParams.month : '') || format(new Date(), 'yyyy-MM')

  const approvedRequests = await fetchApprovedRequests(userDivisionId)
  const documents = await fetchOTDocuments(userDivisionId, monthQuery)

  // Fetch executives for signing
  const supabase = await createClient()
  const { data: executives } = await supabase
    .from('users')
    .select('id, full_name, position, signature_url')
    .eq('role', 'executive')
    .eq('is_deleted', false)

  return (
    <DocumentClient
      divisionId={userDivisionId}
      approvedRequests={approvedRequests || []}
      documents={documents || []}
      executives={executives || []}
    />
  )
}
