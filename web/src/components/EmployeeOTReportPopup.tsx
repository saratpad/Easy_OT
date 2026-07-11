'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { getUnreportedOTRequests, submitEmployeeOTReport } from '@/app/actions/employeeReport'

type OTRequest = {
  id: string
  start_time: string
  end_time: string
  reason: string
  total_hours: number
}

// Generate time options (00:00 to 23:30)
const timeOptions = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

export default function EmployeeOTReportPopup() {
  const [requests, setRequests] = useState<OTRequest[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [isWorked, setIsWorked] = useState<boolean>(true)
  const [actualStartTime, setActualStartTime] = useState<string>('')
  const [actualEndTime, setActualEndTime] = useState<string>('')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true)
      const res = await getUnreportedOTRequests()
      if (res.data && res.data.length > 0) {
        setRequests(res.data as OTRequest[])
      }
      setIsLoading(false)
    }
    fetchRequests()
  }, [])

  useEffect(() => {
    if (requests.length > 0 && requests[currentIndex]) {
      const req = requests[currentIndex]
      // Pre-fill with requested time
      setActualStartTime(format(new Date(req.start_time), 'HH:mm'))
      setActualEndTime(format(new Date(req.end_time), 'HH:mm'))
      setIsWorked(true)
      setIsConfirmed(false)
      setErrorMsg('')
    }
  }, [currentIndex, requests])

  if (isLoading || requests.length === 0 || currentIndex >= requests.length) {
    return null
  }

  const currentReq = requests[currentIndex]

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    
    const d1 = new Date(2000, 0, 1, h1, m1)
    let d2 = new Date(2000, 0, 1, h2, m2)
    
    if (d2 <= d1) {
      d2 = new Date(2000, 0, 2, h2, m2) // cross midnight
    }
    
    return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60)
  }

  const handleSubmit = async () => {
    if (!isConfirmed) {
      setErrorMsg('กรุณากดยืนยันว่าข้อมูลเป็นความจริง')
      return
    }

    if (isWorked && (!actualStartTime || !actualEndTime)) {
      setErrorMsg('กรุณาระบุเวลาให้ครบถ้วน')
      return
    }

    const actualTotalHours = isWorked ? calculateHours(actualStartTime, actualEndTime) : 0

    if (isWorked && actualTotalHours <= 0) {
      setErrorMsg('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      // Need to convert HH:mm back to ISO string relative to the requested date
      let finalStartTimeStr = undefined
      let finalEndTimeStr = undefined
      
      if (isWorked) {
        const reqDate = new Date(currentReq.start_time)
        const [sh, sm] = actualStartTime.split(':').map(Number)
        const [eh, em] = actualEndTime.split(':').map(Number)
        
        const actStart = new Date(reqDate)
        actStart.setHours(sh, sm, 0, 0)
        
        const actEnd = new Date(reqDate)
        actEnd.setHours(eh, em, 0, 0)
        
        if (actEnd <= actStart) {
          actEnd.setDate(actEnd.getDate() + 1) // next day
        }
        
        finalStartTimeStr = actStart.toISOString()
        finalEndTimeStr = actEnd.toISOString()
      }

      const res = await submitEmployeeOTReport(currentReq.id, {
        is_worked: isWorked,
        actual_start_time: finalStartTimeStr,
        actual_end_time: finalEndTimeStr,
        actual_total_hours: actualTotalHours
      })

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        // Move to next request
        setCurrentIndex(prev => prev + 1)
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-gray-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center gap-2 shrink-0">
          <Clock className="w-5 h-5 text-white" />
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">รายงานเวลาปฏิบัติงานจริง</h2>
            <p className="text-primary-100 text-xs">
              รายการที่ {currentIndex + 1} จาก {requests.length}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2 text-blue-800 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block mb-0.5">ถึงเวลาปฏิบัติงานจริงแล้ว</span>
              กรุณาระบุเวลาที่คุณได้ปฏิบัติงานจริง เพื่อให้หัวหน้าพิจารณารับรอง
            </div>
          </div>

          <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-16 shrink-0">วันที่:</span>
              <span className="font-semibold text-gray-900">
                {`${format(new Date(currentReq.start_time), 'dd MMM', { locale: th })} ${new Date(currentReq.start_time).getFullYear() + 543}`}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-16 shrink-0">เวลาที่ขอ:</span>
              <span className="font-medium text-gray-900">
                {format(new Date(currentReq.start_time), 'HH:mm')} - {format(new Date(currentReq.end_time), 'HH:mm')} น. 
                ({currentReq.total_hours} ชม.)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-16 shrink-0">เหตุผล:</span>
              <span className="text-gray-900 line-clamp-2">{currentReq.reason}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">การปฏิบัติงานจริง</h3>
            
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                isWorked ? 'bg-primary/5 border-primary text-primary font-medium shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}>
                <input 
                  type="radio" 
                  name="isWorked" 
                  checked={isWorked} 
                  onChange={() => setIsWorked(true)}
                  className="w-3.5 h-3.5 text-primary border-gray-300 focus:ring-primary"
                />
                ปฏิบัติงาน
              </label>
              
              <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                !isWorked ? 'bg-red-50 border-red-500 text-red-700 font-medium shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}>
                <input 
                  type="radio" 
                  name="isWorked" 
                  checked={!isWorked} 
                  onChange={() => setIsWorked(false)}
                  className="w-3.5 h-3.5 text-red-600 border-gray-300 focus:ring-red-500"
                />
                ไม่ได้ปฏิบัติงาน
              </label>
            </div>

            {isWorked && (
              <div className="grid grid-cols-2 gap-3 mt-2 animate-in fade-in slide-in-from-top-2 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">เริ่มงานจริง</label>
                  <select
                    value={actualStartTime}
                    onChange={(e) => setActualStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">เลิกงานจริง</label>
                  <select
                    value={actualEndTime}
                    onChange={(e) => setActualEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2 text-right pt-1 border-t border-gray-50">
                  <span className="text-xs text-gray-500">
                    รวมเวลาทำจริง: <span className="font-bold text-primary text-sm">{calculateHours(actualStartTime, actualEndTime)} ชม.</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-2.5 bg-amber-50 rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
              <input 
                type="checkbox" 
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 text-amber-600 border-amber-300 rounded focus:ring-amber-500 shrink-0"
              />
              <span className="text-xs text-amber-900 font-medium leading-relaxed">
                ข้าพเจ้าขอรับรองว่าข้อมูลเวลาปฏิบัติงานจริงดังกล่าวเป็นความจริงทุกประการ
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 text-center">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isConfirmed}
            className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold shadow-sm transition-colors text-sm"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                บันทึกและส่งให้หัวหน้ารับรอง
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
