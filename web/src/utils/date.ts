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
