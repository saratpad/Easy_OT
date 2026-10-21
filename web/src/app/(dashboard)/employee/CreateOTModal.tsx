'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Calendar as CalendarIcon, Info, Clock, Sparkles, Check, AlertCircle } from 'lucide-react'
import { createOTRequest, getRecentReasons } from '@/app/actions/ot_requests'
import { getHolidays, type Holiday } from '@/app/actions/holidays'

// สร้างตัวเลือกเวลาทีละ 30 นาที
const timeOptions = Array.from({ length: 48 }).map((_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, '0')
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${hours}:${minutes}`
})

const PRESET_TIMES = [
  { label: 'ปกติ 3 ชม.', start: '16:30', end: '19:30', desc: '16:30 - 19:30 น.' },
  { label: 'พิเศษ 4 ชม.', start: '16:30', end: '20:30', desc: '16:30 - 20:30 น.' },
  { label: 'วันหยุดเต็มวัน', start: '08:30', end: '16:30', desc: '08:30 - 16:30 น.' },
  { label: 'วันหยุดครึ่งวัน', start: '08:30', end: '12:00', desc: '08:30 - 12:00 น.' },
]

export default function CreateOTModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Default to today
  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(todayStr)
  const [startTime, setStartTime] = useState('16:30')
  const [endTime, setEndTime] = useState('19:30')
  const [totalHours, setTotalHours] = useState('3.0')
  const [reason, setReason] = useState('')
  
  const [recentReasons, setRecentReasons] = useState<string[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  // Fetch recent reasons and holidays when modal opens
  useEffect(() => {
    if (isOpen) {
      getRecentReasons().then(reasons => setRecentReasons(reasons)).catch(() => {})
      getHolidays().then(h => setHolidays(h)).catch(() => {})
    }
  }, [isOpen])

  // ฟังก์ชันตรวจสอบวันหยุด
  const getDayType = (dateStr: string) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const day = d.getDay()
    if (day === 0 || day === 6) {
      return { type: 'holiday', name: 'วันหยุดประจำสัปดาห์ (เสาร์-อาทิตย์)', color: 'text-rose-700 bg-rose-50 border-rose-200' }
    }
    const holiday = holidays.find(h => h.date === dateStr)
    if (holiday) {
      return { type: 'holiday', name: `วันหยุดราชการ: ${holiday.name}`, color: 'text-amber-800 bg-amber-50 border-amber-200' }
    }
    return { type: 'workday', name: 'วันทำการปกติ (ราชการ)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
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

  const applyPreset = (start: string, end: string) => {
    setStartTime(start)
    setEndTime(end)
  }

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

      const formData = new FormData()
      formData.set('start_time', startDateTime)
      formData.set('end_time', endDateTime)
      formData.set('total_hours', totalHours)
      formData.set('reason', reason)

      await createOTRequest(formData)
      
      setIsOpen(false)
      setReason('')
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
        type="button"
        id="btn-create-ot"
        data-testid="create-ot-button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-500/25 active:scale-[0.98] text-xs sm:text-sm cursor-pointer"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        สร้างคำร้องขอ OT ใหม่
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">สร้างคำร้องขอ OT ใหม่</h3>
                  <p className="text-xs text-slate-500">กรอกข้อมูลการปฏิบัติงานนอกเวลาราชการ</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Date Input with Holiday detection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">วันที่ปฏิบัติงาน</label>
                <input 
                  type="date" 
                  required 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all" 
                />
                {dayInfo && (
                  <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${dayInfo.color}`}>
                    {dayInfo.type === 'holiday' ? <CalendarIcon className="w-3.5 h-3.5 shrink-0" /> : <Info className="w-3.5 h-3.5 shrink-0" />}
                    <span>{dayInfo.name}</span>
                  </div>
                )}
              </div>

              {/* Quick Preset Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">ช่วงเวลายอดนิยม (คลิกเพื่อเลือกทันที)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PRESET_TIMES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset.start, preset.end)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-xl border text-center transition-all ${
                        startTime === preset.start && endTime === preset.end
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="font-semibold">{preset.label}</div>
                      <div className={`text-[10px] ${startTime === preset.start && endTime === preset.end ? 'text-blue-100' : 'text-slate-400'}`}>
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Pickers & Total Hours */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">เวลาเริ่มต้น</label>
                  <select 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all font-mono"
                  >
                    {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t} น.</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">เวลาสิ้นสุด</label>
                  <select 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all font-mono"
                  >
                    {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t} น.</option>)}
                  </select>
                </div>
              </div>

              {/* Calculated Total Hours Banner */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100/80 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-medium text-blue-900">รวมระยะเวลาการปฏิบัติงาน</span>
                <span className="text-lg font-bold text-blue-600 font-display">
                  {totalHours} <span className="text-xs font-normal text-blue-700">ชั่วโมง</span>
                </span>
              </div>

              {/* Reason / Mission Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เหตุผลความจำเป็น / ภารกิจที่ปฏิบัติ
                </label>
                <input 
                  type="text"
                  required 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm placeholder-slate-400 focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all" 
                  placeholder="พิมพ์รายละเอียดภารกิจ หรือเลือกจากรายการยอดนิยมด้านล่าง..."
                />

                {/* Popular Reasons chips */}
                <div className="mt-2.5">
                  <p className="text-[11px] text-slate-400 mb-1.5">รายการภารกิจที่ใช้บ่อย (คลิกเพื่อเลือกทันที):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'จัดเตรียมเอกสารการประชุมและรายงานสรุป',
                      'สรุปรายงานผลการปฏิบัติราชการประจำเดือน',
                      'ปฏิบัติงานเร่งด่วนตามข้อสั่งการของผู้บริหาร',
                      'ตรวจทานเอกสารงบประมาณและโครงการ',
                      ...recentReasons.slice(0, 3)
                    ].filter((item, idx, arr) => arr.indexOf(item) === idx).map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left truncate max-w-full ${
                          reason === r
                            ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-2.5 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 text-xs sm:text-sm transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || Number(totalHours) <= 0 || !date || !reason.trim()} 
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50 text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันและส่งคำร้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
