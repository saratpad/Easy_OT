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

  // ดึงรายการกองทั้งหมดเพื่อระบุชื่อขอบเขตและแสดงใน dropdown
  const divisions = await fetchDivisions()
  let groups: any[] = []

  // Resolve scope based on role and searchParams
  if (role === 'supervisor') {
    effectiveDivisionId = user.division_id || undefined
    effectiveGroupId = user.group_id || undefined
    if (effectiveDivisionId) {
      groups = await fetchGroups(effectiveDivisionId)
    }
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
    
    // Fetch groups if a division is selected
    if (effectiveDivisionId) {
      groups = await fetchGroups(effectiveDivisionId)
    }
  }

  const fiscalYearQuery = typeof searchParams.fiscal_year === 'string' ? searchParams.fiscal_year : undefined
  const overviewData = await fetchOverviewData(effectiveDivisionId, effectiveGroupId, fiscalYearQuery)

  // Resolve scopeName for UI accurately
  const matchedDiv = divisions.find(d => d.id === effectiveDivisionId)
  const matchedGroup = groups.find(g => g.id === effectiveGroupId)

  let scopeName = 'ระดับองค์กร (ภาพรวมทุกกอง)'
  if (effectiveGroupId && matchedGroup) {
    scopeName = `ระดับกลุ่มงาน (${matchedGroup.name})`
  } else if (effectiveGroupId) {
    scopeName = 'ระดับกลุ่มงาน'
  } else if (effectiveDivisionId && matchedDiv) {
    scopeName = `ระดับกอง (${matchedDiv.name})`
  } else if (effectiveDivisionId) {
    scopeName = 'ระดับกอง'
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
      userDivisionId={user.division_id || undefined}
    />
  )
}
