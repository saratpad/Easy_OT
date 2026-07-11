'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Calendar as CalendarIcon, Info } from 'lucide-react'
import { createOTRequest, getRecentReasons } from '@/app/actions/ot_requests'
import { getHolidays, type Holiday } from '@/app/actions/holidays'

// สร้างตัวเลือกเวลาทีละ 30 นาที
const timeOptions = Array.from({ length: 48 }).map((_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, '0')
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${hours}:${minutes}`
})

export default function CreateOTModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('16:30')
  const [endTime, setEndTime] = useState('19:30')
  const [totalHours, setTotalHours] = useState('3.0')
  
  const [recentReasons, setRecentReasons] = useState<string[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  // Fetch recent reasons and holidays when modal opens
  useEffect(() => {
    if (isOpen) {
      getRecentReasons().then(reasons => setRecentReasons(reasons)).catch(console.error)
      getHolidays().then(h => setHolidays(h)).catch(console.error)
    }
  }, [isOpen])

  // ฟังก์ชันตรวจสอบวันหยุด
  const getDayType = (dateStr: string) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const day = d.getDay()
    if (day === 0 || day === 6) {
      return { type: 'holiday', name: 'วันหยุด (เสาร์-อาทิตย์)', color: 'text-red-600 bg-red-50 border-red-200' }
    }
    const holiday = holidays.find(h => h.date === dateStr)
    if (holiday) {
      return { type: 'holiday', name: `วันหยุดราชการ (${holiday.name})`, color: 'text-orange-600 bg-orange-50 border-orange-200' }
    }
    return { type: 'workday', name: 'วันทำการปกติ', color: 'text-green-700 bg-green-50 border-green-200' }
  }

  const dayInfo = getDayType(date)

  // คำนวณเวลาอัตโนมัติ
  useEffect(() => {
    if (startTime && endTime) {
      const startIdx = timeOptions.indexOf(startTime)
      const endIdx = timeOptions.indexOf(endTime)
      if (endIdx > startIdx) {
        const diff = (endIdx - startIdx) * 0.5
        setTotalHours(diff.toFixed(1))
      } else {
        setTotalHours('0.0')
      }
    }
  }, [startTime, endTime])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // ตรวจสอบความถูกต้องของเวลา
    if (Number(totalHours) <= 0) {
      alert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      setIsSubmitting(false)
      return
    }
    
    try {
      // สร้าง ISO String พร้อมกำหนด Timezone เป็น +07:00 (เวลาไทย)
      const startDateTime = new Date(`${date}T${startTime}:00+07:00`).toISOString()
      const endDateTime = new Date(`${date}T${endTime}:00+07:00`).toISOString()

      const formData = new FormData(e.currentTarget)
      
      // เอาค่าที่จัดรูปแบบแล้วใส่กลับเข้าไปใน formData เพื่อส่งให้ Server Action
      formData.set('start_time', startDateTime)
      formData.set('end_time', endDateTime)
      formData.set('total_hours', totalHours)

      await createOTRequest(formData)
      
      setIsOpen(false)
      setDate('') // Reset
    } catch (error) {
      console.error(error)
      alert('เกิดข้อผิดพลาดในการสร้างคำร้อง')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <Plus className="w-5 h-5 mr-2" />
        สร้างคำร้องใหม่
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">สร้างคำร้องขอ OT ใหม่</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ทำ OT</label>
                <div className="relative">
                  <input 
                    type="date" 
                    required 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                {dayInfo && (
                  <div className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${dayInfo.color}`}>
                    {dayInfo.type === 'holiday' ? <CalendarIcon className="w-3.5 h-3.5 mr-1" /> : <Info className="w-3.5 h-3.5 mr-1" />}
                    {dayInfo.name}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                  <select 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                  <select 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รวมจำนวนชั่วโมง</label>
                <input 
                  type="text" 
                  value={totalHours} 
                  readOnly 
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผลการขอ OT / ภารกิจ</label>
                <input 
                  type="text"
                  name="reason" 
                  required 
                  list="recent-reasons"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary outline-none" 
                  placeholder="เลือกจากรายการแนะนำ หรือพิมพ์ภารกิจใหม่..."
                  autoComplete="off"
                />
                <datalist id="recent-reasons">
                  {recentReasons.map((r, idx) => (
                    <option key={idx} value={r} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  สามารถเลือกจากรายการที่มีคนในกองใช้บ่อย หรือพิมพ์สร้างภารกิจใหม่ได้เลย
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSubmitting || Number(totalHours) <= 0 || !date} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50">
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกคำร้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
