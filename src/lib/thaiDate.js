/**
 * Thai date / time utilities
 */
const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]
const THAI_SHORT_MONTHS = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
]
const THAI_DIGITS = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙']

export function toThaiDigits(str) {
  return String(str).replace(/[0-9]/g, d => THAI_DIGITS[parseInt(d, 10)])
}

/** Returns "29 กรกฎาคม 2568" */
export function formatThaiDate(dateInput) {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  if (isNaN(d)) return String(dateInput)
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** Returns "ก.ค. 2568" */
export function formatThaiShortMonthYear(dateInput) {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  return `${THAI_SHORT_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** Returns "09:30" */
export function formatTime(timeStr) {
  if (!timeStr) return '-'
  return timeStr.slice(0, 5)
}

/** Returns full Thai datetime string */
export function formatThaiDateTime(isoString) {
  if (!isoString) return '-'
  const d = new Date(isoString)
  const datePart = formatThaiDate(d)
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${datePart} เวลา ${hours}:${mins} น.`
}

/** Generates array of half-hour time options "00:00" … "23:30" */
export function generateTimeOptions() {
  const opts = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      opts.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
  }
  return opts
}

/** Calculate hours between two "HH:MM" strings */
export function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0
}
