import { getSessionUser } from '@/app/actions/auth'
import { fetchDivisions, fetchGroups } from '@/app/actions/admin'
import { fetchOverviewData } from '@/app/actions/overview'
import { redirect } from 'next/navigation'
import OverviewClient from './OverviewClient'

const ALLOWED_ROLES = ['supervisor', 'director', 'executive', 'super_admin', 'sub_admin']

export default async function OverviewPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await getSessionUser()

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    redirect('/employee')
  }

  const searchParams = await props.searchParams
  const role = user.role

  let effectiveDivisionId: string | undefined = undefined
  let effectiveGroupId: string | undefined = undefined

  let divisions: any[] = []
  let groups: any[] = []

  // Resolve scope based on role and searchParams
  if (role === 'supervisor') {
    effectiveDivisionId = user.division_id || undefined
    effectiveGroupId = user.group_id || undefined
  } else if (role === 'director' || role === 'sub_admin') {
    effectiveDivisionId = user.division_id || undefined
    effectiveGroupId = (searchParams.group_id as string) || undefined
    
    // Fetch groups for this division
    if (effectiveDivisionId) {
      groups = await fetchGroups(effectiveDivisionId)
    }
  } else if (role === 'executive' || role === 'super_admin') {
    effectiveDivisionId = (searchParams.division_id as string) || undefined
    effectiveGroupId = (searchParams.group_id as string) || undefined
    
    // Fetch all divisions
    divisions = await fetchDivisions()
    // Fetch groups if a division is selected
    if (effectiveDivisionId) {
      groups = await fetchGroups(effectiveDivisionId)
    }
  }

  const overviewData = await fetchOverviewData(effectiveDivisionId, effectiveGroupId)

  // Resolve scopeName for UI
  let scopeName = 'ระดับองค์กร (Organization)'
  if (effectiveGroupId && groups.length > 0) {
    const groupName = groups.find(g => g.id === effectiveGroupId)?.name || 'ไม่ทราบกลุ่ม'
    scopeName = `ระดับกลุ่มงาน (${groupName})`
  } else if (effectiveDivisionId && divisions.length > 0) {
    const divName = divisions.find(d => d.id === effectiveDivisionId)?.name || 'ไม่ทราบกอง'
    scopeName = `ระดับกอง (${divName})`
  } else if (role === 'director' || role === 'sub_admin') {
    // They are looking at their own division but divisions wasn't fetched
    scopeName = 'ระดับกอง (Division)'
  } else if (role === 'supervisor') {
    scopeName = 'ระดับกลุ่มงาน (Group)'
  }

  return (
    <OverviewClient 
      overviewData={overviewData} 
      role={role} 
      divisions={divisions}
      groups={groups}
      selectedDivisionId={effectiveDivisionId || ''}
      selectedGroupId={effectiveGroupId || ''}
      scopeName={scopeName}
    />
  )
}
