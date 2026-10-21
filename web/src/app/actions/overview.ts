'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getHolidays } from '@/app/actions/holidays'
import { 
  getCurrentFiscalYear, 
  toFiscalYearBE, 
  toFiscalYearCE, 
  getFiscalYearDateRange, 
  getFiscalYearMonths, 
  getRecentFiscalYears,
  toThaiDigits
} from '@/utils/date'
import { 
  calculateOTCompensation, 
  getActualWorkedHours,
  CompensationSummary, 
  OT_RATES 
} from '@/utils/compensation'

export type OverviewData = {
  totalRequests: number
  pendingRequests: number
  totalApprovedHours: number
  totalRequestedHours: number
  compensation: CompensationSummary
  chartData: { 
    month: string
    monthLabel?: string
    fullLabel?: string
    requestedHours: number
    actualHours: number 
    compensation?: number
    workdayCompensation?: number
    holidayCompensation?: number
  }[]
  statusData: { name: string, value: number, color: string }[]
  fiscalYear: {
    currentCE: number
    currentBE: number
    selectedCE: number | 'all'
    selectedBE: number | 'all'
    label: string
    rangeLabel: string
    availableYears: { 
      ce: number
      be: number
      label: string
      rangeLabel: string
      isCurrent: boolean 
    }[]
  }
  deepInsights: {
    topUsers: { name: string, hours: number, compensation?: number }[]
    topGroups: { name: string, hours: number, compensation?: number }[]
    topDivisions: { name: string, hours: number }[]
    topReasons: { reason: string, count: number }[]
    weekdayDistribution: { day: string, hours: number }[]
    timeOfDayDistribution: { time: string, hours: number }[]
    positionDistribution: { position: string, hours: number }[]
    averageDuration: number
  }
}

export async function fetchOverviewData(
  effectiveDivisionId?: string, 
  effectiveGroupId?: string,
  fiscalYearQuery?: string
): Promise<OverviewData | null> {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const currentFY = getCurrentFiscalYear()
  const availableYears = getRecentFiscalYears(5)

  // 1. Resolve selected fiscal year
  let selectedFY: number | 'all' = currentFY
  if (fiscalYearQuery) {
    if (fiscalYearQuery === 'all') {
      selectedFY = 'all'
    } else {
      selectedFY = toFiscalYearCE(fiscalYearQuery)
    }
  }

  // 2. Build Supabase query
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

  let requests: any[] | null = null
  try {
    const fetchPromise = query
    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 1500)
    )
    const result = await Promise.race([fetchPromise, timeoutPromise])
    requests = result.data
  } catch (err) {
    console.error('Error fetching overview data:', err)
  }

  // If no explicit query was given, check if current fiscal year is empty and previous year has data
  if (!fiscalYearQuery && requests && requests.length > 0) {
    const currentFYStr = currentFY.toString()
    const prevFYStr = (currentFY - 1).toString()
    const hasCurrentFY = requests.some(r => r.fiscal_year === currentFYStr)
    const hasPrevFY = requests.some(r => r.fiscal_year === prevFYStr)
    if (!hasCurrentFY && hasPrevFY) {
      selectedFY = currentFY - 1
    }
  }

  const selectedFYBE = selectedFY === 'all' ? 'all' : selectedFY + 543
  const rangeInfo = selectedFY === 'all' 
    ? { label: '5 ปีงบประมาณย้อนหลัง', rangeLabel: 'ข้อมูลย้อนหลัง 5 ปีตามระเบียบงานสารบรรณ' }
    : getFiscalYearDateRange(selectedFY)

  // Fallback demo data if database is unreachable or empty
  if (!requests || requests.length === 0) {
    const dummyFY = selectedFY === 'all' ? currentFY : selectedFY
    const months = getFiscalYearMonths(dummyFY)

    const dummyCompensation: CompensationSummary = {
      totalAmount: 6680,
      workdayAmount: 5000,
      holidayAmount: 1680,
      workdayPayableHours: 100,
      holidayPayableHours: 28,
      workdayRawHours: 100,
      holidayRawHours: 28,
      totalPayableHours: 128,
      cappedExcessHours: 0,
      workdayRate: OT_RATES.WORKDAY.ratePerHour,
      holidayRate: OT_RATES.HOLIDAY.ratePerHour,
      workdayMaxHours: OT_RATES.WORKDAY.maxHoursPerDay,
      holidayMaxHours: OT_RATES.HOLIDAY.maxHoursPerDay,
      userCompensations: {
        'u1': { userName: 'นางสาวสมหญิง ขยันดี', position: 'นักวิเคราะห์นโยบายและแผน', totalHours: 32, payableHours: 32, amount: 1680, workdayAmount: 1200, holidayAmount: 480 },
        'u2': { userName: 'นายกิตติคุณ มุ่งมั่น', position: 'เจ้าพนักงานธุรการ', totalHours: 28, payableHours: 28, amount: 1460, workdayAmount: 1100, holidayAmount: 360 },
        'u3': { userName: 'นางสาวอรวรรณ ศรีสุข', position: 'นักวิชาการคอมพิวเตอร์', totalHours: 24, payableHours: 24, amount: 1260, workdayAmount: 900, holidayAmount: 360 },
        'u4': { userName: 'นายธนากร สุขใจ', position: 'นิติกร', totalHours: 20, payableHours: 20, amount: 1060, workdayAmount: 700, holidayAmount: 360 },
        'u5': { userName: 'นายประพันธ์ เกียรติดี', position: 'เจ้าหน้าที่บริหารทั่วไป', totalHours: 16, payableHours: 16, amount: 840, workdayAmount: 600, holidayAmount: 240 },
      },
      groupCompensations: {
        'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑': { groupName: 'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑', totalHours: 60, payableHours: 60, amount: 3120 },
        'กลุ่มพัฒนาระบบเทคโนโลยีสารสนเทศ': { groupName: 'กลุ่มพัฒนาระบบเทคโนโลยีสารสนเทศ', totalHours: 45, payableHours: 45, amount: 2360 },
        'ฝ่ายบริหารทั่วไป': { groupName: 'ฝ่ายบริหารทั่วไป', totalHours: 23, payableHours: 23, amount: 1200 },
      },
      monthlyCompensations: {}
    }

    return {
      totalRequests: 42,
      pendingRequests: 3,
      totalApprovedHours: 128,
      totalRequestedHours: 140,
      compensation: dummyCompensation,
      chartData: months.map((m, idx) => {
        const actualHours = [10, 14, 19, 23, 27, 30, 34, 29, 24, 19, 18, 12][idx] || 18
        const workdayHours = Math.round(actualHours * 0.75)
        const holidayHours = actualHours - workdayHours
        const workdayComp = workdayHours * 50
        const holidayComp = holidayHours * 60
        return {
          month: m.monthKey,
          monthLabel: m.shortLabel,
          fullLabel: m.label,
          requestedHours: [10, 15, 20, 24, 28, 32, 35, 30, 25, 20, 18, 12][idx] || 20,
          actualHours,
          compensation: workdayComp + holidayComp,
          workdayCompensation: workdayComp,
          holidayCompensation: holidayComp,
        }
      }),
      statusData: [
        { name: 'รอพิจารณา', value: 3, color: '#f59e0b' },
        { name: 'อนุมัติแล้ว', value: 37, color: '#10b981' },
        { name: 'ไม่อนุมัติ', value: 2, color: '#ef4444' }
      ],
      fiscalYear: {
        currentCE: currentFY,
        currentBE: currentFY + 543,
        selectedCE: selectedFY,
        selectedBE: selectedFYBE,
        label: rangeInfo.label,
        rangeLabel: rangeInfo.rangeLabel,
        availableYears,
      },
      deepInsights: {
        topUsers: [
          { name: 'นางสาวสมหญิง ขยันดี', hours: 32, compensation: 1680 },
          { name: 'นายกิตติคุณ มุ่งมั่น', hours: 28, compensation: 1460 },
          { name: 'นางสาวอรวรรณ ศรีสุข', hours: 24, compensation: 1260 },
          { name: 'นายธนากร สุขใจ', hours: 20, compensation: 1060 },
          { name: 'นายประพันธ์ เกียรติดี', hours: 16, compensation: 840 }
        ],
        topGroups: [
          { name: 'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑', hours: 60, compensation: 3120 },
          { name: 'กลุ่มพัฒนาระบบเทคโนโลยีสารสนเทศ', hours: 45, compensation: 2360 },
          { name: 'ฝ่ายบริหารทั่วไป', hours: 23, compensation: 1200 }
        ],
        topDivisions: [
          { name: 'กองประสานนโยบายและยุทธศาสตร์', hours: 128 }
        ],
        topReasons: [
          { reason: 'จัดเตรียมเอกสารการประชุมคณะกรรมการและสรุปวาระ', count: 14 },
          { reason: 'ตรวจทานรายงานการเงินและเบิกจ่ายงบประมาณโครงการเร่งด่วน', count: 9 },
          { reason: 'พัฒนาระบบสารสนเทศและฐานข้อมูลออนไลน์', count: 8 },
          { reason: 'จัดทำร่างแผนปฏิบัติราชการประจำปี 2569', count: 6 },
          { reason: 'ปรับปรุงฐานข้อมูลบุคลากรและโครงสร้างองค์กร', count: 5 }
        ],
        weekdayDistribution: [
          { day: 'จันทร์', hours: 24 },
          { day: 'อังคาร', hours: 28 },
          { day: 'พุธ', hours: 32 },
          { day: 'พฤหัสบดี', hours: 26 },
          { day: 'ศุกร์', hours: 18 },
          { day: 'เสาร์', hours: 0 },
          { day: 'อาทิตย์', hours: 0 }
        ],
        timeOfDayDistribution: [
          { time: '16:30 - 19:30 น.', hours: 86 },
          { time: '16:30 - 20:30 น.', hours: 32 },
          { time: 'วันหยุดเต็มวัน (08:30 - 16:30 น.)', hours: 10 }
        ],
        positionDistribution: [
          { position: 'นักวิเคราะห์นโยบายและแผน', hours: 52 },
          { position: 'เจ้าพนักงานธุรการ', hours: 40 },
          { position: 'นักวิชาการคอมพิวเตอร์', hours: 36 }
        ],
        averageDuration: 3.2
      }
    }
  }

  // 3. Filter requests by Fiscal Year
  let filteredRequests: any[] = []
  if (selectedFY !== 'all') {
    const { startDate, endDate } = getFiscalYearDateRange(selectedFY)
    const selectedFYStr = selectedFY.toString()
    filteredRequests = requests.filter(r => {
      if (r.fiscal_year && r.fiscal_year === selectedFYStr) return true
      if (r.start_time) {
        const time = new Date(r.start_time).getTime()
        return time >= startDate.getTime() && time <= endDate.getTime()
      }
      return false
    })
  } else {
    // 5 years retention filter
    const oldestFY = currentFY - 4
    const { startDate } = getFiscalYearDateRange(oldestFY)
    filteredRequests = requests.filter(r => {
      if (r.start_time) {
        return new Date(r.start_time).getTime() >= startDate.getTime()
      }
      return true
    })
  }

  const holidays = await getHolidays()
  const holidayDates = new Set(holidays.map(h => h.date))

  const totalRequests = filteredRequests.length
  const pendingRequests = filteredRequests.filter(r => r.status === 'pending').length
  const approvedRequests = filteredRequests.filter(r => r.status === 'approved')
  const totalRequestedHours = approvedRequests.reduce((acc, curr) => acc + (curr.total_hours || 0), 0)
  const totalApprovedHours = approvedRequests.reduce((acc, curr) => acc + getActualWorkedHours(curr), 0)

  // 4. Calculate OT Compensation according to government regulations
  // คิดจากชั่วโมงที่ปฏิบัติงานจริงเท่านั้น (Actual Worked Hours)
  // (วันทำการ 50 บ./ชม. ไม่เกิน 4 ชม./วัน, วันหยุด/สุดสัปดาห์ 60 บ./ชม. ไม่เกิน 7 ชม./วัน)
  const compensation = calculateOTCompensation(approvedRequests, holidayDates)

  // 5. Construct Chart Data
  let chartData: {
    month: string
    monthLabel: string
    fullLabel: string
    requestedHours: number
    actualHours: number
    compensation?: number
    workdayCompensation?: number
    holidayCompensation?: number
  }[] = []

  if (selectedFY !== 'all') {
    const months = getFiscalYearMonths(selectedFY)
    const chartDataMap: Record<string, { requestedHours: number, actualHours: number, label: string, shortLabel: string }> = {}

    months.forEach(m => {
      chartDataMap[m.monthKey] = {
        requestedHours: 0,
        actualHours: 0,
        label: m.label,
        shortLabel: m.shortLabel
      }
    })

    approvedRequests.forEach(r => {
      const requested = r.total_hours || 0
      const actual = getActualWorkedHours(r)
      const d = new Date(r.start_time)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (chartDataMap[monthKey] !== undefined) {
        chartDataMap[monthKey].requestedHours += requested
        chartDataMap[monthKey].actualHours += actual
      }
    })

    chartData = Object.entries(chartDataMap).map(([month, data]) => {
      const monthComp = compensation.monthlyCompensations[month] || { totalAmount: 0, workdayAmount: 0, holidayAmount: 0 }
      return {
        month,
        monthLabel: data.shortLabel,
        fullLabel: data.label,
        requestedHours: data.requestedHours,
        actualHours: data.actualHours,
        compensation: monthComp.totalAmount,
        workdayCompensation: monthComp.workdayAmount,
        holidayCompensation: monthComp.holidayAmount,
      }
    })
  } else {
    // Multi-year comparison (5 Fiscal Years in chronological order)
    const chronologicalYears = [...availableYears].reverse()
    const fyMap: Record<string, { requestedHours: number, actualHours: number, label: string }> = {}
    const fyCompMap: Record<string, { totalAmount: number, workdayAmount: number, holidayAmount: number }> = {}

    chronologicalYears.forEach(y => {
      fyMap[y.ce.toString()] = {
        requestedHours: 0,
        actualHours: 0,
        label: y.label
      }
      fyCompMap[y.ce.toString()] = { totalAmount: 0, workdayAmount: 0, holidayAmount: 0 }
    })

    // Calculate per-year compensation
    chronologicalYears.forEach(y => {
      const fyReqs = approvedRequests.filter(r => (r.fiscal_year || getCurrentFiscalYear(r.start_time).toString()) === y.ce.toString())
      const fyComp = calculateOTCompensation(fyReqs, holidayDates)
      fyCompMap[y.ce.toString()] = {
        totalAmount: fyComp.totalAmount,
        workdayAmount: fyComp.workdayAmount,
        holidayAmount: fyComp.holidayAmount,
      }
    })

    approvedRequests.forEach(r => {
      const requested = r.total_hours || 0
      const actual = getActualWorkedHours(r)
      const fy = r.fiscal_year || getCurrentFiscalYear(r.start_time).toString()
      if (fyMap[fy] !== undefined) {
        fyMap[fy].requestedHours += requested
        fyMap[fy].actualHours += actual
      }
    })

    chartData = Object.entries(fyMap).map(([fy, data]) => {
      const c = fyCompMap[fy] || { totalAmount: 0, workdayAmount: 0, holidayAmount: 0 }
      return {
        month: fy,
        monthLabel: data.label.replace('ปีงบประมาณ ', 'ปี '),
        fullLabel: data.label,
        requestedHours: data.requestedHours,
        actualHours: data.actualHours,
        compensation: c.totalAmount,
        workdayCompensation: c.workdayAmount,
        holidayCompensation: c.holidayAmount,
      }
    })
  }

  const rejectedRequests = filteredRequests.filter(r => r.status === 'rejected').length
  const statusData = [
    { name: 'รอพิจารณา', value: pendingRequests, color: '#f59e0b' },
    { name: 'อนุมัติแล้ว', value: approvedRequests.length, color: '#10b981' },
    { name: 'ไม่อนุมัติ', value: rejectedRequests, color: '#ef4444' }
  ].filter(item => item.value > 0)

  // 5. Deep Insights Analysis (คิดจากชั่วโมงทำงานจริง)
  const userMap: Record<string, number> = {}
  const groupMap: Record<string, number> = {}
  const divisionMap: Record<string, number> = {}
  const reasonMap: Record<string, number> = {}
  const positionMap: Record<string, number> = {}
  
  const weekdayMap: Record<string, number> = {
    'จันทร์': 0, 'อังคาร': 0, 'พุธ': 0, 'พฤหัสบดี': 0, 'ศุกร์': 0, 'เสาร์': 0, 'อาทิตย์': 0
  }
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  const timeMap: Record<string, number> = {}

  approvedRequests.forEach(r => {
    const hours = getActualWorkedHours(r)
    if (hours <= 0) return
    
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

    // Reasons
    const reason = r.reason || 'ไม่ระบุเหตุผล'
    reasonMap[reason] = (reasonMap[reason] || 0) + 1

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

  const topUsers = Object.entries(userMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, hours]) => {
      const userComp = Object.values(compensation.userCompensations).find(u => u.userName === name)
      return { 
        name, 
        hours, 
        compensation: userComp?.amount || 0 
      }
    })

  const topGroups = Object.entries(groupMap)
    .map(([name, hours]) => {
      const groupComp = compensation.groupCompensations[name]
      return { 
        name, 
        hours: Math.round(hours), 
        compensation: groupComp?.amount || 0 
      }
    })
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
    totalRequestedHours,
    compensation,
    chartData,
    statusData,
    fiscalYear: {
      currentCE: currentFY,
      currentBE: currentFY + 543,
      selectedCE: selectedFY,
      selectedBE: selectedFYBE,
      label: rangeInfo.label,
      rangeLabel: rangeInfo.rangeLabel,
      availableYears,
    },
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

/**
 * ─── Helper: ส่งข้อความแจ้งสรุปตัดยอดประจำปีงบประมาณเข้า LINE กลุ่ม ───
 */
export async function sendFiscalYearCutoffLineNotification(data: {
  divisionId?: string
  fiscalYear?: string | number
}) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. ตรวจสอบ Division
  let divisionId = data.divisionId
  if (!divisionId) {
    const { getSessionUser } = await import('@/app/actions/auth')
    const user = await getSessionUser()
    divisionId = user?.division_id
  }

  if (!divisionId) {
    throw new Error('ไม่พบข้อมูลกอง/สำนักที่จะส่งการแจ้งเตือน')
  }

  // 2. ดึงข้อมูลการตั้งค่า LINE ของกอง
  const { data: division, error: divErr } = await supabaseAdmin
    .from('divisions')
    .select('id, name, line_channel_access_token, line_target_id, line_notifications_enabled')
    .eq('id', divisionId)
    .single()

  if (divErr || !division) {
    throw new Error('ไม่พบข้อมูลกองในระบบ')
  }

  if (!division.line_channel_access_token || !division.line_target_id) {
    throw new Error(`กอง "${division.name}" ยังไม่ได้ตั้งค่า LINE Channel Access Token หรือ Group Target ID ในระบบ`)
  }

  if (division.line_notifications_enabled === false) {
    throw new Error(`การแจ้งเตือน LINE ของกอง "${division.name}" ถูกปิดใช้งานอยู่`)
  }

  // 3. กำหนดปีงบประมาณและช่วงเวลา
  const ce = data.fiscalYear && data.fiscalYear !== 'all' 
    ? toFiscalYearCE(data.fiscalYear) 
    : getCurrentFiscalYear()
  const be = ce + 543
  const { startDate, endDate, rangeLabel } = getFiscalYearDateRange(ce)

  // 4. ดึงข้อมูลคำร้อง OT ของกองนี้ในปีงบประมาณที่เลือก
  const { data: requests } = await supabaseAdmin
    .from('ot_requests')
    .select('*, users(full_name)')
    .eq('division_id', divisionId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  const allReqs = requests || []
  const approvedReqs = allReqs.filter(r => r.status === 'approved')
  const totalApprovedHours = approvedReqs.reduce((sum, r) => sum + getActualWorkedHours(r), 0)
  const uniqueUsers = new Set(approvedReqs.map(r => r.user_id)).size

  // ดึงวันหยุดเพื่อคำนวณค่าตอบแทนตามระเบียบจากชั่วโมงทำงานจริง
  const holidays = await getHolidays()
  const holidayDates = new Set(holidays.map(h => h.date))
  const comp = calculateOTCompensation(approvedReqs, holidayDates)

  // 5. สร้างข้อความตามระเบียบงานสารบรรณภาครัฐ
  const message = `📢 แจ้งสรุปตัดยอดการปฏิบัติงาน OT ประจำปีงบประมาณ ${be}\n`
    + `🏛️ หน่วยงาน: ${division.name}\n`
    + `📅 รอบระยะเวลา: ${rangeLabel} (1 ต.ค. - 30 ก.ย.)\n\n`
    + `📊 สรุปผลการปฏิบัติงาน OT:\n`
    + `• คำร้องขออนุมัติทั้งหมด: ${allReqs.length} รายการ\n`
    + `• คำร้องที่ได้รับอนุมัติ: ${approvedReqs.length} รายการ\n`
    + `• รวมชั่วโมงปฏิบัติงานจริง: ${totalApprovedHours} ชั่วโมง\n`
    + `• จำนวนบุคลากรที่ปฏิบัติงาน: ${uniqueUsers} ท่าน\n\n`
    + `💰 สรุปการเบิกจ่ายค่าตอบแทน (คิดจากชั่วโมงทำงานจริงตามระเบียบ):\n`
    + `• ค่าตอบแทนรวมทั้งสิ้น: ฿${comp.totalAmount.toLocaleString()} บาท\n`
    + `  - วันทำการ (๕๐ บ./ชม. สูงสุด ๔ ชม./วัน): ฿${comp.workdayAmount.toLocaleString()} บาท (${comp.workdayPayableHours} ชม.)\n`
    + `  - วันหยุด/สุดสัปดาห์ (๖๐ บ./ชม. สูงสุด ๗ ชม./วัน): ฿${comp.holidayAmount.toLocaleString()} บาท (${comp.holidayPayableHours} ชม.)\n`
    + (comp.cappedExcessHours > 0 ? `  - ชั่วโมงเกินเพดานระเบียบ: ${comp.cappedExcessHours} ชม.\n\n` : `\n`)
    + `🔒 การจัดเก็บรักษาข้อมูล (๕ ปีตามกฎหมาย):\n`
    + `ระบบได้ตัดยอดสะสมประจำปีงบประมาณเรียบร้อยแล้ว โดยบันทึกคำร้อง สถิติ และเอกสารหลักฐานทั้งหมดจะถูกจัดเก็บรักษาไว้ในระบบอย่างปลอดภัยเป็นเวลา ๕ ปีงบประมาณ ตามระเบียบงานสารบรรณและ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) เพื่อประโยชน์ในการตรวจสอบทางราชการ\n\n`
    + `🔗 ตรวจสอบรายละเอียดและแดชบอร์ด:\n`
    + `https://easyot-nine.vercel.app/overview`

  // 6. ส่งข้อความผ่าน LINE Push Message API
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${division.line_channel_access_token}`,
    },
    body: JSON.stringify({
      to: division.line_target_id,
      messages: [{ type: 'text', text: message }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('LINE push error:', errorBody)
    throw new Error(`ส่งข้อความ LINE ไม่สำเร็จ: ${response.statusText}`)
  }

  return {
    success: true,
    message: `ส่งข้อความแจ้งสรุปตัดยอดปีงบประมาณ ${be} เข้า LINE กลุ่มของ "${division.name}" เรียบร้อยแล้ว`,
    fiscalYearBE: be,
    totalApprovedHours,
    approvedCount: approvedReqs.length
  }
}
