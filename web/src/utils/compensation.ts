/**
 * ระเบียบการเบิกจ่ายเงินตอบแทนการปฏิบัติงานนอกเวลาราชการ
 * ตามระเบียบกระทรวงการคลัง / ระเบียบทางราชการ:
 * 1. วันทำการ: ชั่วโมงละ 50 บาท ไม่เกิน 4 ชั่วโมงต่อคนต่อวัน
 * 2. วันหยุดราชการ และ วันหยุดสุดสัปดาห์: ชั่วโมงละ 60 บาท ไม่เกิน 7 ชั่วโมงต่อคนต่อวัน
 */

export const OT_RATES = {
  WORKDAY: {
    ratePerHour: 50,
    maxHoursPerDay: 4,
    label: 'วันทำการ (๕๐ บาท/ชม. ไม่เกิน ๔ ชม./คน/วัน)',
  },
  HOLIDAY: {
    ratePerHour: 60,
    maxHoursPerDay: 7,
    label: 'วันหยุดราชการ/สุดสัปดาห์ (๖๐ บาท/ชม. ไม่เกิน ๗ ชม./คน/วัน)',
  },
} as const

export function getBangkokDateStr(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  // Convert UTC timestamp to UTC+7 (Bangkok)
  const bangkokTime = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return bangkokTime.toISOString().split('T')[0]
}

export function isHolidayOrWeekend(dateStr: string, holidayDates: Set<string>): boolean {
  const parts = dateStr.split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return false
  }
  const [y, m, d] = parts
  const utcDate = new Date(Date.UTC(y, m - 1, d))
  const dayOfWeek = utcDate.getUTCDay() // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 || dayOfWeek === 6 || holidayDates.has(dateStr)
}

export type CompensationSummary = {
  totalAmount: number
  workdayAmount: number
  holidayAmount: number
  workdayPayableHours: number
  holidayPayableHours: number
  workdayRawHours: number
  holidayRawHours: number
  totalPayableHours: number
  cappedExcessHours: number
  workdayRate: number
  holidayRate: number
  workdayMaxHours: number
  holidayMaxHours: number
  userCompensations: Record<string, {
    userName: string
    position: string
    totalHours: number
    payableHours: number
    amount: number
    workdayAmount: number
    holidayAmount: number
  }>
  groupCompensations: Record<string, {
    groupName: string
    totalHours: number
    payableHours: number
    amount: number
  }>
  monthlyCompensations: Record<string, {
    monthKey: string
    workdayAmount: number
    holidayAmount: number
    totalAmount: number
  }>
}

/**
 * ดึงชั่วโมงที่ปฏิบัติงานจริง (Actual Worked Hours)
 * - หากระบุว่าไม่ได้มาทำงานจริง (is_worked === false) -> 0 ชั่วโมง
 * - หากมีบันทึกชั่วโมงจริง (actual_total_hours !== null && !== undefined) -> ใช้ actual_total_hours
 * - หากยังไม่มีการบันทึกชั่วโมงจริง (actual_total_hours === null) -> 0 ชั่วโมง (ยังไม่มีชั่วโมงทำจริงตามระเบียบ)
 */
export function getActualWorkedHours(req: any): number {
  if (req.is_worked === false) {
    return 0
  }
  if (req.actual_total_hours !== null && req.actual_total_hours !== undefined) {
    const act = Number(req.actual_total_hours)
    return isNaN(act) || act < 0 ? 0 : act
  }
  return 0
}

/**
 * คำนวณค่าตอบแทนการปฏิบัติงานนอกเวลาราชการตามระเบียบ
 * โดยคิดจาก "ชั่วโมงที่ปฏิบัติงานจริง" (Actual Worked Hours) เท่านั้น
 * คำนวณเป็น "รายคน รายวัน" เพื่อบังคับใช้เพดานชั่วโมงอย่างถูกต้อง
 */
export function calculateOTCompensation(
  approvedRequests: any[],
  holidayDates: Set<string>
): CompensationSummary {
  // จัดกลุ่มคำร้องตาม: user_id + '_' + dateStr (วันในเวลาไทย)
  type DayBucket = {
    userId: string
    userName: string
    position: string
    groupName: string
    divisionName: string
    dateStr: string
    monthKey: string
    isHoliday: boolean
    rawHours: number
  }

  const dayBuckets: Record<string, DayBucket> = {}

  approvedRequests.forEach((req) => {
    // คิดจากชั่วโมงที่ปฏิบัติงานจริงเท่านั้น
    const actualHours = getActualWorkedHours(req)
    if (actualHours <= 0) return

    const userId = req.user_id || 'unknown'
    const dateStr = req.start_time ? getBangkokDateStr(req.start_time) : '1970-01-01'
    const monthKey = dateStr.slice(0, 7) // YYYY-MM
    const key = `${userId}_${dateStr}`

    const isHoliday = isHolidayOrWeekend(dateStr, holidayDates)
    const userName = req.users?.full_name || 'ไม่ระบุชื่อ'
    const position = req.users?.position || 'ไม่ระบุตำแหน่ง'
    const groupName = req.groups?.name || 'ไม่ระบุกลุ่ม'
    const divisionName = req.divisions?.name || 'ไม่ระบุกอง'

    if (!dayBuckets[key]) {
      dayBuckets[key] = {
        userId,
        userName,
        position,
        groupName,
        divisionName,
        dateStr,
        monthKey,
        isHoliday,
        rawHours: 0,
      }
    }

    dayBuckets[key].rawHours += actualHours
  })

  let totalAmount = 0
  let workdayAmount = 0
  let holidayAmount = 0
  let workdayPayableHours = 0
  let holidayPayableHours = 0
  let workdayRawHours = 0
  let holidayRawHours = 0
  let cappedExcessHours = 0

  const userCompensations: CompensationSummary['userCompensations'] = {}
  const groupCompensations: CompensationSummary['groupCompensations'] = {}
  const monthlyCompensations: CompensationSummary['monthlyCompensations'] = {}

  Object.values(dayBuckets).forEach((bucket) => {
    const { isHoliday, rawHours, userId, userName, position, groupName, monthKey } = bucket
    const rate = isHoliday ? OT_RATES.HOLIDAY.ratePerHour : OT_RATES.WORKDAY.ratePerHour
    const maxDaily = isHoliday ? OT_RATES.HOLIDAY.maxHoursPerDay : OT_RATES.WORKDAY.maxHoursPerDay

    const payableHours = Math.min(rawHours, maxDaily)
    const excess = Math.max(0, rawHours - maxDaily)
    const amount = payableHours * rate

    totalAmount += amount
    cappedExcessHours += excess

    if (isHoliday) {
      holidayAmount += amount
      holidayPayableHours += payableHours
      holidayRawHours += rawHours
    } else {
      workdayAmount += amount
      workdayPayableHours += payableHours
      workdayRawHours += rawHours
    }

    // สรุปรายบุคคล
    if (!userCompensations[userId]) {
      userCompensations[userId] = {
        userName,
        position,
        totalHours: 0,
        payableHours: 0,
        amount: 0,
        workdayAmount: 0,
        holidayAmount: 0,
      }
    }
    userCompensations[userId].totalHours += rawHours
    userCompensations[userId].payableHours += payableHours
    userCompensations[userId].amount += amount
    if (isHoliday) {
      userCompensations[userId].holidayAmount += amount
    } else {
      userCompensations[userId].workdayAmount += amount
    }

    // สรุปรายกลุ่ม
    if (groupName) {
      if (!groupCompensations[groupName]) {
        groupCompensations[groupName] = {
          groupName,
          totalHours: 0,
          payableHours: 0,
          amount: 0,
        }
      }
      groupCompensations[groupName].totalHours += rawHours
      groupCompensations[groupName].payableHours += payableHours
      groupCompensations[groupName].amount += amount
    }

    // สรุปรายเดือน
    if (!monthlyCompensations[monthKey]) {
      monthlyCompensations[monthKey] = {
        monthKey,
        workdayAmount: 0,
        holidayAmount: 0,
        totalAmount: 0,
      }
    }
    monthlyCompensations[monthKey].totalAmount += amount
    if (isHoliday) {
      monthlyCompensations[monthKey].holidayAmount += amount
    } else {
      monthlyCompensations[monthKey].workdayAmount += amount
    }
  })

  return {
    totalAmount,
    workdayAmount,
    holidayAmount,
    workdayPayableHours,
    holidayPayableHours,
    workdayRawHours,
    holidayRawHours,
    totalPayableHours: workdayPayableHours + holidayPayableHours,
    cappedExcessHours,
    workdayRate: OT_RATES.WORKDAY.ratePerHour,
    holidayRate: OT_RATES.HOLIDAY.ratePerHour,
    workdayMaxHours: OT_RATES.WORKDAY.maxHoursPerDay,
    holidayMaxHours: OT_RATES.HOLIDAY.maxHoursPerDay,
    userCompensations,
    groupCompensations,
    monthlyCompensations,
  }
}
