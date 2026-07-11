'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getHolidays } from '@/app/actions/holidays'

export type OverviewData = {
  totalRequests: number
  pendingRequests: number
  totalApprovedHours: number
  chartData: { month: string, requestedHours: number, actualHours: number }[]
  statusData: { name: string, value: number, color: string }[]
  deepInsights: {
    topUsers: { name: string, hours: number }[]
    topGroups: { name: string, hours: number }[]
    topDivisions: { name: string, hours: number }[]
    topReasons: { reason: string, count: number }[]
    weekdayDistribution: { day: string, hours: number }[]
    timeOfDayDistribution: { time: string, hours: number }[]
    positionDistribution: { position: string, hours: number }[]
    averageDuration: number
  }
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'เจ้าหน้าที่',
  supervisor: 'ผอ.กลุ่ม',
  director: 'ผอ.กอง',
  executive: 'ผู้บริหาร',
  sub_admin: 'ผู้ดูแล (กอง)',
  super_admin: 'ผู้ดูแลระบบ',
}

export async function fetchOverviewData(effectiveDivisionId?: string, effectiveGroupId?: string): Promise<OverviewData | null> {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabaseAdmin.from('ot_requests').select(`
    *,
    users (full_name, position, role),
    groups (name),
    divisions (name)
  `)

  if (effectiveGroupId) {
    query = query.eq('group_id', effectiveGroupId)
  } else if (effectiveDivisionId) {
    query = query.eq('division_id', effectiveDivisionId)
  }

  const { data: requests, error } = await query
  if (error || !requests) {
    console.error('Error fetching overview data:', error)
    return null
  }

  const holidays = await getHolidays()
  const holidayDates = new Set(holidays.map(h => h.date))

  const totalRequests = requests.length
  const pendingRequests = requests.filter(r => r.status === 'pending').length
  const approvedRequests = requests.filter(r => r.status === 'approved')
  const totalApprovedHours = approvedRequests.reduce((acc, curr) => acc + (curr.actual_total_hours ?? curr.total_hours), 0)
  
  const chartDataMap: Record<string, { requestedHours: number, actualHours: number }> = {}
  
  const today = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    chartDataMap[monthKey] = { requestedHours: 0, actualHours: 0 }
  }

  approvedRequests.forEach(r => {
    const requested = r.total_hours || 0
    const actual = r.actual_total_hours !== null && r.actual_total_hours !== undefined ? r.actual_total_hours : 0
    const d = new Date(r.start_time)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (chartDataMap[monthKey] !== undefined) {
      chartDataMap[monthKey].requestedHours += requested
      chartDataMap[monthKey].actualHours += actual
    }
  })

  const chartData = Object.entries(chartDataMap).map(([month, data]) => ({
    month,
    requestedHours: data.requestedHours,
    actualHours: data.actualHours
  }))

  const rejectedRequests = requests.filter(r => r.status === 'rejected').length
  const statusData = [
    { name: 'รอพิจารณา', value: pendingRequests, color: '#f59e0b' },
    { name: 'อนุมัติแล้ว', value: approvedRequests.length, color: '#10b981' },
    { name: 'ไม่อนุมัติ', value: rejectedRequests, color: '#ef4444' }
  ].filter(item => item.value > 0)

  // --- Deep Insights Analysis ---
  
  const userMap: Record<string, number> = {}
  const groupMap: Record<string, number> = {}
  const divisionMap: Record<string, number> = {}
  const reasonMap: Record<string, number> = {}
  const positionMap: Record<string, number> = {}
  
  // Initialize Weekday map (Mon-Sun)
  const weekdayMap: Record<string, number> = {
    'จันทร์': 0, 'อังคาร': 0, 'พุธ': 0, 'พฤหัสบดี': 0, 'ศุกร์': 0, 'เสาร์': 0, 'อาทิตย์': 0
  }
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  
  // Initialize Time of Day map
  const timeMap: Record<string, number> = {}

  approvedRequests.forEach(r => {
    const hours = r.actual_total_hours ?? r.total_hours
    
    // Top Users
    const userName = (r.users as any)?.full_name || 'ไม่ระบุชื่อ'
    userMap[userName] = (userMap[userName] || 0) + hours

    // Top Groups
    const groupName = (r.groups as any)?.name || 'ไม่ระบุกลุ่ม'
    groupMap[groupName] = (groupMap[groupName] || 0) + hours

    // Top Divisions
    const divisionName = (r.divisions as any)?.name || 'ไม่ระบุกอง'
    divisionMap[divisionName] = (divisionMap[divisionName] || 0) + hours

    // Positions
    const positionName = (r.users as any)?.position || 'ไม่ระบุตำแหน่ง'
    positionMap[positionName] = (positionMap[positionName] || 0) + hours

    // Reasons (Doing What)
    const reason = r.reason || 'ไม่ระบุเหตุผล'
    reasonMap[reason] = (reasonMap[reason] || 0) + 1 // Count requests, not hours, for reasons

    const d = new Date(r.start_time)
    const thDate = new Date(d.getTime() + 7 * 60 * 60 * 1000)
    
    // Weekday distribution
    const dayName = dayNames[thDate.getUTCDay()]
    if (weekdayMap[dayName] !== undefined) {
      weekdayMap[dayName] += hours
    }

    // Time of day distribution
    const dateStr = thDate.toISOString().split('T')[0]
    const isWeekend = thDate.getUTCDay() === 0 || thDate.getUTCDay() === 6
    const isHoliday = isWeekend || holidayDates.has(dateStr)

    if (isHoliday) {
      timeMap['วันหยุดราชการ'] = (timeMap['วันหยุดราชการ'] || 0) + hours
    } else {
      const startStr = thDate.toISOString().split('T')[1].substring(0, 5)
      
      const endD = new Date(r.end_time)
      const endThDate = new Date(endD.getTime() + 7 * 60 * 60 * 1000)
      const endStr = endThDate.toISOString().split('T')[1].substring(0, 5)
      
      const timeLabel = `${startStr} - ${endStr}`
      timeMap[timeLabel] = (timeMap[timeLabel] || 0) + hours
    }
  })

  // Sort and pick Top 5
  const topUsers = Object.entries(userMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, hours]) => ({ name, hours }))

  const topGroups = Object.entries(groupMap)
    .map(([name, hours]) => ({ name, hours: Math.round(hours) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)

  const topDivisions = Object.entries(divisionMap)
    .map(([name, hours]) => ({ name, hours: Math.round(hours) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)

  const topReasons = Object.entries(reasonMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))
    
  const positionDistribution = Object.entries(positionMap)
    .sort((a, b) => b[1] - a[1])
    .map(([position, hours]) => ({ position, hours }))

  // Maintain chronological order for weekdays (Mon-Sun)
  const orderedDays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
  const weekdayDistribution = orderedDays.map(day => ({
    day,
    hours: weekdayMap[day]
  }))

  const timeOfDayDistribution = Object.entries(timeMap)
    .map(([time, hours]) => ({ time, hours }))

  const averageDuration = approvedRequests.length > 0 
    ? parseFloat((totalApprovedHours / approvedRequests.length).toFixed(1))
    : 0

  return {
    totalRequests,
    pendingRequests,
    totalApprovedHours,
    chartData,
    statusData,
    deepInsights: {
      topUsers,
      topGroups,
      topDivisions,
      topReasons,
      weekdayDistribution,
      timeOfDayDistribution,
      positionDistribution,
      averageDuration
    }
  }
}
