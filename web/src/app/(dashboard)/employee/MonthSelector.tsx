'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar as CalendarIcon } from 'lucide-react'
import { 
  getCurrentFiscalYear, 
  getRecentFiscalYears, 
  getFiscalYearMonths, 
  formatInBangkok 
} from '@/utils/date'

export default function MonthSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentVal = searchParams.get('month') || formatInBangkok(new Date(), 'yyyy-MM')

  const currentFY = getCurrentFiscalYear()
  const fiscalYears = getRecentFiscalYears(5)

  return (
    <div className="relative inline-flex items-center">
      <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      <select 
        value={currentVal}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set('month', e.target.value)
          router.push(`?${params.toString()}`)
        }}
        className="pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 min-w-[220px] shadow-2xs cursor-pointer transition-all"
      >
        <optgroup label="📋 สรุปตัดยอดรายปีงบประมาณ (1 ต.ค. - 30 ก.ย.)">
          {fiscalYears.map(fy => (
            <option key={`fy-${fy.ce}`} value={`fy-${fy.ce}`}>
              {fy.label} ({fy.rangeLabel}) {fy.isCurrent ? '★' : ''}
            </option>
          ))}
        </optgroup>

        {fiscalYears.slice(0, 2).map(fy => {
          const months = getFiscalYearMonths(fy.ce).reverse() // ล่าสุดก่อน
          return (
            <optgroup key={`months-${fy.ce}`} label={`📅 รายเดือน ${fy.label}`}>
              {months.map(m => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.label} ({m.shortLabel})
                </option>
              ))}
            </optgroup>
          )
        })}

        <optgroup label="🔒 ข้อมูลย้อนหลังตามระเบียบ ๕ ปี">
          <option value="all">ทั้งหมด (5 ปีงบประมาณย้อนหลัง)</option>
        </optgroup>
      </select>
    </div>
  )
}
