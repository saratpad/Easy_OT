import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import ApproverClient from './ApproverClient'
import { getSessionUser } from '@/app/actions/auth'
import { format } from 'date-fns'

export default async function ApproverDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Get current user from session
  const user = await getSessionUser()
  if (!user) return null // Middleware จัดการ redirect แล้ว

  const userId = user.id
  const userRole = user.role
  const userDivisionId = user.division_id

  const isAdmin = userRole === 'super_admin' || userRole === 'sub_admin'

  let pendingRequests: any[] = []
  let historyRequests: any[] = []
  let certificationRequests: any[] = []
  let certHistoryRequests: any[] = []

  // Check if feature is enabled
  let enableWorkCertification = false
  try {
    const { data: settingsData } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'enable_work_certification').single()
    if (settingsData && settingsData.value === 'true') {
      enableWorkCertification = true
    }
  } catch (e) {}

  const monthQuery = (typeof resolvedSearchParams.month === 'string' ? resolvedSearchParams.month : '') || format(new Date(), 'yyyy-MM')
  
  if (isAdmin) {
    // ADMIN FLOW: สามารถดูได้ทั้งหมด (super_admin) หรือทั้งกอง (sub_admin) แต่ทำอะไรไม่ได้
    // Fetch Pending
    let pendingQuery = supabaseAdmin
      .from('ot_requests')
      .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (userRole === 'sub_admin') {
      pendingQuery = pendingQuery.eq('division_id', userDivisionId)
    }
    const { data: adminPending } = await pendingQuery
    if (adminPending) pendingRequests = adminPending

    // Fetch History
    let historyQuery = supabaseAdmin
      .from('ot_requests')
      .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
      .neq('status', 'pending')
      .order('updated_at', { ascending: false })

    if (userRole === 'sub_admin') {
      historyQuery = historyQuery.eq('division_id', userDivisionId)
    }

    if (monthQuery !== 'all') {
      const year = parseInt(monthQuery.split('-')[0])
      const month = parseInt(monthQuery.split('-')[1])
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`
      
      historyQuery = historyQuery.gte('updated_at', startDate).lt('updated_at', endDate)
    } else {
      historyQuery = historyQuery.limit(100)
    }
    
    const { data: adminHistory } = await historyQuery
    if (adminHistory) {
      historyRequests = adminHistory.map(req => ({
        ...req,
        acted_at: req.updated_at
      }))
    }
    
    // Fetch Certification Tracking for Admin
    if (enableWorkCertification) {
      let trackingQuery = supabaseAdmin
        .from('ot_requests')
        .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
        .eq('status', 'approved')
        .eq('is_certified', false)
        .lt('end_time', new Date().toISOString())
        .order('end_time', { ascending: false })

      let trackingHistQuery = supabaseAdmin
        .from('ot_requests')
        .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
        .eq('status', 'approved')
        .eq('is_certified', true)
        .order('end_time', { ascending: false })

      if (userRole === 'sub_admin') {
        trackingQuery = trackingQuery.eq('division_id', userDivisionId)
        trackingHistQuery = trackingHistQuery.eq('division_id', userDivisionId)
      }
      
      const [{ data: trackingData }, { data: trackingHistData }] = await Promise.all([
        trackingQuery,
        trackingHistQuery.limit(50)
      ])
      
      if (trackingData) {
        certificationRequests = trackingData
      }
      if (trackingHistData) {
        certHistoryRequests = trackingHistData
      }
    }
  } else {
    // APPROVER FLOW: กระบวนการปกติสำหรับผู้อนุมัติ
    // 2. ค้นหา step ที่ผู้ใช้รับผิดชอบ
    let routeQuery = supabase
      .from('approval_routes')
      .select('step_order, division_id')
      .eq('target_role', userRole)

    if (userRole !== 'executive') {
      routeQuery = routeQuery.eq('division_id', userDivisionId)
    }

    const { data: routeSteps } = await routeQuery

    // 3. Fetch Pending Requests
    if (routeSteps && routeSteps.length > 0) {
      for (const route of routeSteps) {
        let query = supabaseAdmin
          .from('ot_requests')
          .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
          .eq('division_id', route.division_id)
          .eq('current_step', route.step_order)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (userRole === 'supervisor') {
          if (user.group_id) {
            query = query.eq('group_id', user.group_id)
          } else {
            query = query.is('group_id', null)
          }
        }

        const { data: pending } = await query
        if (pending) {
          pendingRequests = [...pendingRequests, ...pending]
        }
      }
    }

    // 4. Fetch History 
    let historyQuery = supabaseAdmin
      .from('ot_request_approvals')
      .select('request_id, status, acted_at, ot_requests(*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name))')
      .eq('approver_id', userId)
      .order('acted_at', { ascending: false })

    if (monthQuery !== 'all') {
      const year = parseInt(monthQuery.split('-')[0])
      const month = parseInt(monthQuery.split('-')[1])
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`
      
      historyQuery = historyQuery.gte('acted_at', startDate).lt('acted_at', endDate)
    } else {
      historyQuery = historyQuery.limit(50)
    }

    const { data: historyData } = await historyQuery

    historyRequests = historyData?.map(h => {
      const req = h.ot_requests as any
      if (!req) return null
      return {
        ...req,
        status: h.status,
        acted_at: h.acted_at,
      }
    }).filter(Boolean) || []
    
    // 5. Fetch Certification Requests
    if (enableWorkCertification && (userRole === 'supervisor' || userRole === 'director')) {
      let certQuery = supabaseAdmin
        .from('ot_requests')
        .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
        .eq('status', 'approved')
        .eq('is_certified', false)
        .lt('end_time', new Date().toISOString())
        .order('end_time', { ascending: false })

      let certHistQuery = supabaseAdmin
        .from('ot_requests')
        .select('*, user:users!user_id(full_name, position), division:divisions!division_id(name), group:groups!group_id(name)')
        .eq('status', 'approved')
        .order('end_time', { ascending: false })

      if (userRole === 'supervisor') {
        certQuery = certQuery.eq('certification_step', 0)
        certHistQuery = certHistQuery.neq('certification_step', 0)
        
        if (user.group_id) {
          certQuery = certQuery.eq('group_id', user.group_id)
          certHistQuery = certHistQuery.eq('group_id', user.group_id)
        } else {
          certQuery = certQuery.is('group_id', null)
          certHistQuery = certHistQuery.is('group_id', null)
        }
      } else if (userRole === 'director') {
        certQuery = certQuery.eq('certification_step', 1).eq('division_id', userDivisionId)
        certHistQuery = certHistQuery.or('is_certified.eq.true,certification_step.eq.-1').eq('division_id', userDivisionId)
      }

      const [{ data: certData }, { data: certHistData }] = await Promise.all([
        certQuery,
        certHistQuery.limit(50)
      ])
      
      if (certData) {
        certificationRequests = certData
      }
      if (certHistData) {
        certHistoryRequests = certHistData
      }
    }
  }

  return (
    <ApproverClient
      pendingRequests={pendingRequests}
      historyRequests={historyRequests as any[]}
      certificationRequests={certificationRequests}
      certHistoryRequests={certHistoryRequests}
      isAdmin={isAdmin}
      userRole={userRole}
    />
  )
}
