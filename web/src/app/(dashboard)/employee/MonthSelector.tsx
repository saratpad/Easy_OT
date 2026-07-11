'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { format, subMonths } from 'date-fns'
import { th } from 'date-fns/locale'

export default function MonthSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM')

  // Generate last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return {
      value: format(d, 'yyyy-MM'),
      label: `${format(d, 'MMMM', { locale: th })} ${d.getFullYear() + 543}`
    }
  })

  return (
    <select 
      value={currentMonth}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('month', e.target.value)
        router.push(`?${params.toString()}`)
      }}
      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px] shadow-sm cursor-pointer"
    >
      {months.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
      <option value="all">ทั้งหมด (All Time)</option>
    </select>
  )
}
