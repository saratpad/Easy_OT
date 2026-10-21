import { format as dateFnsFormat } from 'date-fns'
import { th } from 'date-fns/locale'

/**
 * Converts any date representation to a Date object shifted to represent Asia/Bangkok time,
 * allowing standard date formatting tools that use system timezone to display Bangkok time.
 */
export function toBangkokTime(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date()
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  
  // Convert UTC time to Bangkok timezone date string and parse it
  const bangkokString = date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  return new Date(bangkokString)
}

/**
 * Formats a date using Bangkok timezone.
 */
export function formatInBangkok(dateInput: string | Date | null | undefined, formatStr: string): string {
  if (!dateInput) return ''
  const tzDate = toBangkokTime(dateInput)
  return dateFnsFormat(tzDate, formatStr, { locale: th })
}

/**
 * แปลงเลขอารบิกเป็นเลขไทย
 */
export function toThaiDigits(text: string | number): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']
  return text.toString().replace(/[0-9]/g, match => thaiDigits[parseInt(match, 10)])
}

/**
 * คำนวณปีงบประมาณของราชการไทย (1 ต.ค. - 30 ก.ย.)
 * เดือน 10, 11, 12 จะนับเป็นปีงบประมาณถัดไป
 * คืนค่าเป็นปี ค.ศ. เช่น 2026, 2027
 */
export function getCurrentFiscalYear(dateInput?: Date | string | null): number {
  const date = toBangkokTime(dateInput || new Date())
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  return month >= 10 ? year + 1 : year
}

/**
 * แปลงปีงบประมาณเป็น พ.ศ. (เช่น 2026 -> 2569, 2027 -> 2570)
 */
export function toFiscalYearBE(fy: number | string): number {
  const n = typeof fy === 'string' ? parseInt(fy, 10) : fy
  if (isNaN(n)) return getCurrentFiscalYear() + 543
  return n >= 2400 ? n : n + 543
}

/**
 * แปลงปีงบประมาณเป็น ค.ศ. (เช่น 2569 -> 2026, 2570 -> 2027)
 */
export function toFiscalYearCE(fy: number | string): number {
  const n = typeof fy === 'string' ? parseInt(fy, 10) : fy
  if (isNaN(n)) return getCurrentFiscalYear()
  return n >= 2400 ? n - 543 : n
}

/**
 * ดึงช่วงเวลา (Start & End Date) ของปีงบประมาณ (1 ต.ค. - 30 ก.ย.)
 */
export function getFiscalYearDateRange(fiscalYearInput?: number | string) {
  const ce = fiscalYearInput ? toFiscalYearCE(fiscalYearInput) : getCurrentFiscalYear()
  const be = ce + 543

  // 1 ต.ค. (ce - 1) 00:00:00 เวลาไทย (UTC+7) -> (ce - 1)-09-30T17:00:00.000Z
  const startDate = new Date(Date.UTC(ce - 1, 9, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  // 30 ก.ย. ce 23:59:59.999 เวลาไทย -> ce-09-30T16:59:59.999Z
  const endDate = new Date(Date.UTC(ce, 9, 1, 0, 0, 0) - 7 * 60 * 60 * 1000 - 1)

  return {
    ce,
    be,
    startDate,
    endDate,
    startIso: startDate.toISOString(),
    endIso: new Date(Date.UTC(ce, 9, 1, 0, 0, 0) - 7 * 60 * 60 * 1000).toISOString(),
    label: `ปีงบประมาณ ${be}`,
    rangeLabel: `1 ต.ค. ${be - 1} – 30 ก.ย. ${be}`
  }
}

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

/**
 * ดึงรายการ 12 เดือนของปีงบประมาณตามลำดับราชการ (ต.ค. -> ก.ย.)
 */
export function getFiscalYearMonths(fiscalYearInput?: number | string) {
  const ce = fiscalYearInput ? toFiscalYearCE(fiscalYearInput) : getCurrentFiscalYear()
  const be = ce + 543

  const months: {
    monthKey: string
    month: number
    yearCE: number
    yearBE: number
    label: string
    shortLabel: string
  }[] = []

  // ตุลาคม - ธันวาคม ของปีก่อนหน้า
  for (let m = 10; m <= 12; m++) {
    const key = `${ce - 1}-${String(m).padStart(2, '0')}`
    months.push({
      monthKey: key,
      month: m,
      yearCE: ce - 1,
      yearBE: be - 1,
      label: `${THAI_MONTHS_FULL[m - 1]} ${be - 1}`,
      shortLabel: `${THAI_MONTHS_SHORT[m - 1]} ${String(be - 1).slice(2)}`,
    })
  }

  // มกราคม - กันยายน ของปีงบประมาณ
  for (let m = 1; m <= 9; m++) {
    const key = `${ce}-${String(m).padStart(2, '0')}`
    months.push({
      monthKey: key,
      month: m,
      yearCE: ce,
      yearBE: be,
      label: `${THAI_MONTHS_FULL[m - 1]} ${be}`,
      shortLabel: `${THAI_MONTHS_SHORT[m - 1]} ${String(be).slice(2)}`,
    })
  }

  return months
}

/**
 * รายการ 5 ปีงบประมาณย้อนหลังตามเกณฑ์จัดเก็บข้อมูลราชการ 5 ปี
 */
export function getRecentFiscalYears(count: number = 5) {
  const currentCE = getCurrentFiscalYear()
  const list: {
    ce: number
    be: number
    label: string
    rangeLabel: string
    isCurrent: boolean
  }[] = []

  for (let i = 0; i < count; i++) {
    const ce = currentCE - i
    const be = ce + 543
    list.push({
      ce,
      be,
      label: `ปีงบประมาณ ${be}`,
      rangeLabel: `1 ต.ค. ${be - 1} – 30 ก.ย. ${be}`,
      isCurrent: i === 0
    })
  }

  return list
}
