import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit3, 
  Clock, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Building2,
  Calendar,
  CheckCheck,
  UserCheck
} from 'lucide-react'
import { certifyBySupervisor, reviewByDirector, bulkCertifyBySupervisor, bulkNotWorkedBySupervisor, bulkReviewByDirector } from '@/app/actions/certification'

type OTRequest = {
  id: string
  start_time: string
  end_time: string
  total_hours: number
  reason: string
  certification_step?: number
  is_certified?: boolean
  is_worked?: boolean
  actual_start_time?: string
  actual_end_time?: string
  actual_total_hours?: number
  certification_note?: string
  user: {
    full_name: string
    position: string
  }
  division?: { name: string }
  group?: { name: string }
}

const timeOptions = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

export default function CertificationTab({ 
  requests, 
  historyRequests = [],
  userRole 
}: { 
  requests: OTRequest[], 
  historyRequests?: OTRequest[],
  userRole?: string 
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Modal State
  const [adjustModalReq, setAdjustModalReq] = useState<OTRequest | null>(null)
  const [adjustStart, setAdjustStart] = useState('')
  const [adjustEnd, setAdjustEnd] = useState('')

  // Tree View State
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (nodeId: string) => {
    const next = new Set(expandedNodes)
    if (next.has(nodeId)) next.delete(nodeId)
    else next.add(nodeId)
    setExpandedNodes(next)
  }

  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(requests.map(r => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleBulkAction = async (actionType: 'certify' | 'reject' | 'revise' | 'not_worked') => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    
    if (userRole === 'director') {
      let action: 'approve' | 'reject' | 'revise' = 'approve'
      let note = ''
      
      if (actionType === 'certify') action = 'approve'
      else if (actionType === 'reject') action = 'reject'
      else if (actionType === 'revise') action = 'revise'
      else return

      if (action === 'revise' || action === 'reject') {
        const input = prompt('ระบุหมายเหตุสำหรับการทำรายการหลายรายการ (บังคับ):')
        if (!input) return
        note = input
      } else {
        if (!confirm(`ยืนยันรับรองการปฏิบัติงานจำนวน ${ids.length} รายการ?`)) return
      }

      setIsBulkProcessing(true)
      try {
        const res = await bulkReviewByDirector(ids, action, note)
        if (res.error) throw new Error(res.error)
        alert('บันทึกเรียบร้อย')
        setSelectedIds(new Set())
      } catch (e: any) {
        alert(e.message)
      } finally {
        setIsBulkProcessing(false)
      }
    } else {
      if (actionType === 'certify') {
        if (!confirm(`ยืนยันรับรองเวลาปฏิบัติงานจริงตามที่ขอ จำนวน ${ids.length} รายการ?`)) return
        setIsBulkProcessing(true)
        try {
          const res = await bulkCertifyBySupervisor(ids)
          if (res.error) throw new Error(res.error)
          alert('บันทึกเรียบร้อย')
          setSelectedIds(new Set())
        } catch (e: any) {
          alert(e.message)
        } finally {
          setIsBulkProcessing(false)
        }
      } else if (actionType === 'not_worked') {
        if (!confirm(`ยืนยันว่า "ไม่ได้ปฏิบัติงาน" จำนวน ${ids.length} รายการใช่หรือไม่? (บันทึกเป็น 0 ชั่วโมง)`)) return
        setIsBulkProcessing(true)
        try {
          const res = await bulkNotWorkedBySupervisor(ids)
          if (res.error) throw new Error(res.error)
          alert('บันทึกเรียบร้อย')
          setSelectedIds(new Set())
        } catch (e: any) {
          alert(e.message)
        } finally {
          setIsBulkProcessing(false)
        }
      }
    }
  }

  const currentRequests = activeTab === 'pending' ? requests : historyRequests

  const groupedRequests = useMemo(() => {
    const grouped: Record<string, Record<string, OTRequest[]>> = {}
    for (const req of currentRequests) {
      const getObjName = (obj: any) => {
        if (!obj) return null
        if (Array.isArray(obj)) return obj[0]?.name
        return obj.name
      }
      
      const divName = getObjName(req.division) || 'ไม่มีกอง'
      const groupName = getObjName(req.group) || 'ไม่สังกัดกลุ่ม'

      if (!grouped[divName]) grouped[divName] = {}
      if (!grouped[divName][groupName]) grouped[divName][groupName] = []
      grouped[divName][groupName].push(req)
    }
    return grouped
  }, [currentRequests])

  const handleSupervisorCertify = async (req: OTRequest, action: 'certify' | 'adjust' | 'not_worked') => {
    let actualStart = req.actual_start_time || req.start_time
    let actualEnd = req.actual_end_time || req.end_time
    let actualHours = req.actual_total_hours ?? req.total_hours
    let isWorked = true

    if (action === 'certify') {
      const confirmMsg = `ยืนยันรับรองเวลาปฏิบัติงานจริง?\nเวลา: ${format(new Date(actualStart), 'HH:mm')} - ${format(new Date(actualEnd), 'HH:mm')} น.`
      if (!confirm(confirmMsg)) return
    } else if (action === 'adjust') {
      setAdjustStart(format(new Date(actualStart), 'HH:mm'))
      setAdjustEnd(format(new Date(actualEnd), 'HH:mm'))
      setAdjustModalReq(req)
      return
    } else if (action === 'not_worked') {
      isWorked = false
      if (!confirm('ยืนยันว่า "ไม่ได้ปฏิบัติงาน" ใช่หรือไม่? (บันทึกเป็น 0 ชั่วโมง)')) return
      actualHours = 0
    }

    await submitCertification(req, actualStart, actualEnd, actualHours, isWorked)
  }

  const submitCertification = async (req: OTRequest, start: string, end: string, hours: number, isWorked: boolean) => {
    setProcessingId(req.id)
    try {
      const res = await certifyBySupervisor(req.id, {
        actual_start_time: start,
        actual_end_time: end,
        actual_total_hours: hours,
        is_worked: isWorked
      })
      if (res.error) throw new Error(res.error)
      alert('บันทึกการรับรองเรียบร้อย')
      setAdjustModalReq(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleAdjustSubmit = () => {
    if (!adjustModalReq) return

    const startDate = new Date(adjustModalReq.start_time)
    const [sh, sm] = adjustStart.split(':')
    startDate.setHours(parseInt(sh, 10), parseInt(sm || '0', 10))
    
    const endDate = new Date(adjustModalReq.end_time)
    const [eh, em] = adjustEnd.split(':')
    endDate.setHours(parseInt(eh, 10), parseInt(em || '0', 10))

    const actualHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    
    if (actualHours <= 0) {
      alert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      return
    }

    submitCertification(adjustModalReq, startDate.toISOString(), endDate.toISOString(), actualHours, true)
  }

  const handleDirectorReview = async (reqId: string, action: 'approve' | 'reject' | 'revise') => {
    let note = ''
    if (action === 'revise' || action === 'reject') {
      const input = prompt('ระบุหมายเหตุ (บังคับ):')
      if (!input) return
      note = input
    } else {
      if (!confirm('ยืนยันรับรองการปฏิบัติงาน?')) return
    }

    setProcessingId(reqId)
    try {
      const res = await reviewByDirector(reqId, action, note)
      if (res.error) throw new Error(res.error)
      alert('บันทึกเรียบร้อย')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessingId(null)
    }
  }

  const renderRequestCard = (req: OTRequest, isHistory: boolean) => {
    const isProcessing = processingId === req.id
    const isSelected = selectedIds.has(req.id)
    const reqDate = new Date(req.start_time)
    const thaiDateStr = `${format(reqDate, 'd MMM', { locale: th })} ${reqDate.getFullYear() + 543}`
    
    return (
      <div 
        key={req.id} 
        className={`p-4 md:p-5 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isSelected ? 'bg-purple-50/40' : 'hover:bg-slate-50/70'
        }`}
      >
        {/* Left: Checkbox + User avatar + reason */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {!isHistory && (
            <div className="pt-1 shrink-0">
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => toggleSelection(req.id)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
              />
            </div>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            {req.user?.full_name?.charAt(0) || 'ผ'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 truncate">
                {req.user?.full_name}
              </h4>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                {req.user?.position || 'บุคลากร'}
              </span>
            </div>

            <div className="mt-2 text-xs text-gray-700 bg-gray-50/80 border border-gray-100 rounded-lg p-2.5">
              <span className="font-semibold text-gray-900">งานที่ปฏิบัติ: </span>
              {req.reason}
              {req.certification_note && (
                <div className="mt-1.5 pt-1.5 border-t border-amber-200 text-amber-700 font-medium">
                  หมายเหตุเพิ่มเติม: {req.certification_note}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right: Time details + Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
          <div className="text-left md:text-right">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>{thaiDateStr}</span>
            </div>
            
            <div className="mt-1 text-xs text-gray-500">
              ขอไว้: {format(new Date(req.start_time), 'HH:mm')} - {format(new Date(req.end_time), 'HH:mm')} น. ({req.total_hours} ชม.)
            </div>

            {req.is_worked === false ? (
              <div className="text-xs text-rose-600 font-bold mt-0.5">ไม่ได้ปฏิบัติงาน (0 ชม.)</div>
            ) : (req.actual_start_time && req.actual_end_time) ? (
              <div className="text-xs text-blue-700 font-bold mt-0.5">
                เวลาทำจริง: {format(new Date(req.actual_start_time), 'HH:mm')} - {format(new Date(req.actual_end_time), 'HH:mm')} น. ({req.actual_total_hours} ชม.)
              </div>
            ) : null}

            {isHistory && (
              <div className="mt-1.5 flex items-center justify-end">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  req.is_certified 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : req.certification_step === -1 
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {req.is_certified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                  {req.is_certified ? 'รับรองเรียบร้อย' : req.certification_step === -1 ? 'ไม่อนุมัติ' : 'รอรับรอง'}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isHistory && userRole === 'supervisor' && req.certification_step === 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSupervisorCertify(req, 'certify')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>รับรองเวลา</span>
                </button>
                <button
                  onClick={() => handleSupervisorCertify(req, 'adjust')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขเวลา</span>
                </button>
                <button
                  onClick={() => handleSupervisorCertify(req, 'not_worked')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>ไม่มาทำ</span>
                </button>
              </div>
            )}

            {!isHistory && ['director', 'executive', 'super_admin', 'sub_admin'].includes(userRole || '') && req.certification_step === 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDirectorReview(req.id, 'approve')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติรับรอง
                </button>
                <button
                  onClick={() => handleDirectorReview(req.id, 'revise')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  <Edit3 className="w-3.5 h-3.5" /> ให้แก้ไข
                </button>
                <button
                  onClick={() => handleDirectorReview(req.id, 'reject')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-Tabs & Bulk Header */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('pending'); setSelectedIds(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>รอรับรอง ({requests.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); setSelectedIds(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>ประวัติการรับรอง ({historyRequests.length})</span>
          </button>
        </div>
        
        {activeTab === 'pending' && requests.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 shadow-sm select-none">
              <input 
                type="checkbox" 
                checked={selectedIds.size === requests.length && requests.length > 0} 
                onChange={handleSelectAll} 
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" 
              />
              <span>เลือกทั้งหมด ({requests.length})</span>
            </label>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <button 
                  onClick={() => handleBulkAction('certify')} 
                  disabled={isBulkProcessing} 
                  className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  รับรองที่เลือก ({selectedIds.size})
                </button>
                {['director', 'executive', 'super_admin', 'sub_admin'].includes(userRole || '') ? (
                  <>
                    <button 
                      onClick={() => handleBulkAction('revise')} 
                      disabled={isBulkProcessing} 
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                    >
                      แจ้งแก้ไข
                    </button>
                    <button 
                      onClick={() => handleBulkAction('reject')} 
                      disabled={isBulkProcessing} 
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                    >
                      ไม่อนุมัติ
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleBulkAction('not_worked')} 
                    disabled={isBulkProcessing} 
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 hover:bg-gray-200 disabled:opacity-50"
                  >
                    ไม่ได้ปฏิบัติงาน
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main List Section */}
      <div className="space-y-4">
        {currentRequests.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              {activeTab === 'pending' ? 'ไม่มีรายการค้างรับรองผลการปฏิบัติงาน' : 'ไม่มีประวัติการรับรองผลการปฏิบัติงาน'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              ระบบจะแสดงรายการที่ได้รับการอนุมัติ OT และครบกำหนดเวลาปฏิบัติงานเพื่อรอการรับรอง
            </p>
          </div>
        ) : (
          Object.entries(groupedRequests).map(([divName, groupsMap]) => {
            const divNodeId = `div-${divName}`
            const isDivExpanded = !expandedNodes.has(divNodeId)

            return (
              <div key={divNodeId} className="glass-panel rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm">
                {/* Division Header */}
                <div 
                  onClick={() => toggleNode(divNodeId)}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50/50 via-slate-50 to-white hover:from-purple-50/70 cursor-pointer select-none transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm md:text-base">{divName}</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                    {isDivExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>

                {/* Groups Accordion */}
                {isDivExpanded && (
                  <div className="p-3 md:p-4 space-y-3 bg-slate-50/30">
                    {Object.entries(groupsMap).map(([groupName, reqs]) => {
                      const groupNodeId = `group-${divName}-${groupName}`
                      const isGroupExpanded = !expandedNodes.has(groupNodeId)

                      return (
                        <div key={groupNodeId} className="bg-white rounded-xl border border-gray-200/70 overflow-hidden shadow-xs">
                          {/* Group Header */}
                          <div 
                            onClick={() => toggleNode(groupNodeId)}
                            className="flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100/50 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Users className="w-4 h-4 text-purple-600" />
                              <span className="font-semibold text-gray-800 text-xs md:text-sm">{groupName}</span>
                              <span className="text-xs text-gray-400">({reqs.length} รายการ)</span>
                            </div>
                            {isGroupExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                          </div>

                          {/* Request List */}
                          {isGroupExpanded && (
                            <div className="divide-y divide-gray-100">
                              {reqs.map(req => renderRequestCard(req, activeTab === 'history'))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Adjust Time Modal */}
      {adjustModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">แก้ไขเวลาปฏิบัติงานจริง</h3>
              </div>
              <button 
                onClick={() => setAdjustModalReq(null)} 
                className="w-8 h-8 rounded-lg bg-white/80 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <div className="font-bold">เวลาตามคำขอเดิม:</div>
                <div>{format(new Date(adjustModalReq.start_time), 'HH:mm')} - {format(new Date(adjustModalReq.end_time), 'HH:mm')} น. (รวม {adjustModalReq.total_hours} ชม.)</div>
                <div className="text-blue-700 font-medium pt-1">ผู้ขอ: {adjustModalReq.user?.full_name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">เวลาเริ่มต้นจริง</label>
                  <select 
                    value={adjustStart} 
                    onChange={e => setAdjustStart(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none bg-white shadow-xs"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t} น.</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">เวลาสิ้นสุดจริง</label>
                  <select 
                    value={adjustEnd} 
                    onChange={e => setAdjustEnd(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none bg-white shadow-xs"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t} น.</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button 
                  onClick={() => setAdjustModalReq(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleAdjustSubmit}
                  disabled={processingId === adjustModalReq.id}
                  className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
                >
                  {processingId === adjustModalReq.id ? 'กำลังบันทึก...' : 'บันทึกเวลาใหม่'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
