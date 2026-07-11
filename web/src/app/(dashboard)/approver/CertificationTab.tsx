import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { CheckCircle, XCircle, AlertCircle, Edit2, Clock, X, ChevronDown, ChevronRight, Users, Info } from 'lucide-react'
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
    
    return (
      <div key={req.id} className="p-4 pl-12 hover:bg-gray-50/50 transition-colors flex flex-col xl:flex-row gap-4 items-start relative">
        {!isHistory && (
          <div className="absolute left-4 top-5">
            <input 
              type="checkbox" 
              checked={selectedIds.has(req.id)}
              onChange={() => toggleSelection(req.id)}
              className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
          </div>
        )}
        <div className={`flex justify-between items-start gap-4 flex-1 ${!isHistory ? 'ml-2' : 'ml-4'}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {req.user?.full_name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{req.user?.full_name}</p>
                <p className="text-xs text-gray-500">{req.user?.position}</p>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded w-full">
              <span className="font-medium">เหตุผล:</span> {req.reason}
              {req.certification_note && (
                <div className="mt-2 pt-2 border-t border-gray-200 text-amber-700 whitespace-pre-line">
                  {req.certification_note}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
            <div className="text-sm font-medium text-gray-900">
              {`${format(new Date(req.start_time), 'dd MMM', { locale: th })} ${new Date(req.start_time).getFullYear() + 543}`} 
            </div>
            
            <div className="flex flex-col items-end gap-1 justify-end w-full">
              <div className="text-xs text-gray-500">
                เวลาที่ขอ: {format(new Date(req.start_time), 'HH:mm')} - {format(new Date(req.end_time), 'HH:mm')} น. ({req.total_hours} ชม.)
              </div>
              {req.is_worked === false ? (
                <div className="text-xs text-red-600 font-medium">ไม่ได้ปฏิบัติงาน (0 ชม.)</div>
              ) : (req.actual_start_time && req.actual_end_time) ? (
                <div className="text-xs text-blue-600 font-medium">
                  ทำจริง: {format(new Date(req.actual_start_time), 'HH:mm')} - {format(new Date(req.actual_end_time), 'HH:mm')} น. ({req.actual_total_hours} ชม.)
                </div>
              ) : null}
            </div>

            {activeTab === 'history' && (
              <div className="flex items-center gap-2 justify-end w-full mt-1">
                <div>
                  {req.certification_step === -1 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-red-50 text-red-700 border-red-200">ไม่อนุมัติ</span>
                  ) : req.is_certified ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">รับรองแล้ว</span>
                  ) : req.certification_note && !req.is_certified ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">ปรับปรุงเวลา</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">รอรับรอง</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 xl:ml-4 shrink-0">
          {!isHistory && userRole === 'supervisor' && req.certification_step === 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleSupervisorCertify(req, 'certify')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                รับรองเวลา
              </button>
              <button
                onClick={() => handleSupervisorCertify(req, 'adjust')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
              >
                แก้ไขเวลา
              </button>
              <button
                onClick={() => handleSupervisorCertify(req, 'not_worked')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded border border-gray-200 hover:bg-gray-200 disabled:opacity-50"
              >
                ไม่ได้ปฏิบัติงาน
              </button>
            </div>
          )}

          {!isHistory && ['director', 'executive', 'super_admin', 'sub_admin'].includes(userRole || '') && req.certification_step === 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleDirectorReview(req.id, 'approve')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" /> อนุมัติรับรอง
              </button>
              <button
                onClick={() => handleDirectorReview(req.id, 'revise')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded border border-amber-200 hover:bg-amber-200 disabled:opacity-50 flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> ให้แก้ไข
              </button>
              <button
                onClick={() => handleDirectorReview(req.id, 'reject')}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded border border-red-200 hover:bg-red-200 disabled:opacity-50 flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm min-h-[600px] flex flex-col">
      {/* Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            รอรับรอง ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ml-2 ${activeTab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            ประวัติการรับรอง ({historyRequests.length})
          </button>
        </div>
        
        {activeTab === 'pending' && requests.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={selectedIds.size === requests.length && requests.length > 0} onChange={handleSelectAll} className="rounded text-primary focus:ring-primary w-4 h-4" />
              เลือกทั้งหมด
            </label>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-300">
              <button onClick={() => handleBulkAction('certify')} disabled={isBulkProcessing || selectedIds.size === 0} className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary-dark disabled:opacity-50">รับรองที่เลือก</button>
              {['director', 'executive', 'super_admin', 'sub_admin'].includes(userRole || '') ? (
                <>
                  <button onClick={() => handleBulkAction('revise')} disabled={isBulkProcessing || selectedIds.size === 0} className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded border border-amber-200 hover:bg-amber-200 disabled:opacity-50">แจ้งแก้ไขที่เลือก</button>
                  <button onClick={() => handleBulkAction('reject')} disabled={isBulkProcessing || selectedIds.size === 0} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded border border-red-200 hover:bg-red-200 disabled:opacity-50">ปฏิเสธการรับรองที่เลือก</button>
                </>
              ) : (
                <button onClick={() => handleBulkAction('not_worked')} disabled={isBulkProcessing || selectedIds.size === 0} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded border border-gray-200 hover:bg-gray-200 disabled:opacity-50">ไม่ได้ปฏิบัติงานที่เลือก</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        {currentRequests.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {activeTab === 'pending' ? 'ไม่มีรายการค้างรับรอง' : 'ไม่มีประวัติการรับรอง'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedRequests).map(([divName, groupsMap]) => {
              const divNodeId = `div-${divName}`
              const isDivExpanded = !expandedNodes.has(divNodeId) // Expanded by default

              return (
                <div key={divNodeId} className="bg-white">
                  {/* Division Header */}
                  <div 
                    onClick={() => toggleNode(divNodeId)}
                    className="flex items-center p-4 bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer select-none transition-colors border-b border-gray-100"
                  >
                    {isDivExpanded ? <ChevronDown className="w-5 h-5 text-gray-400 mr-2" /> : <ChevronRight className="w-5 h-5 text-gray-400 mr-2" />}
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 border border-gray-200">
                      <span className="text-primary font-bold text-sm">
                        {divName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{divName}</h3>
                    </div>
                  </div>

                  {/* Groups */}
                  {isDivExpanded && (
                    <div className="divide-y divide-gray-50 border-t border-gray-100 bg-white">
                      {Object.entries(groupsMap).map(([groupName, reqs]) => {
                        const groupNodeId = `group-${divName}-${groupName}`
                        const isGroupExpanded = !expandedNodes.has(groupNodeId) // Expanded by default

                        return (
                          <div key={groupNodeId}>
                            {/* Group Header */}
                            <div 
                              onClick={() => toggleNode(groupNodeId)}
                              className="flex items-center justify-between p-3 pl-10 hover:bg-gray-50 cursor-pointer select-none transition-colors border-b border-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                {isGroupExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                <Users className="w-4 h-4 text-indigo-500" />
                                <span className="font-medium text-gray-700">{groupName}</span>
                                <span className="text-xs text-gray-400">({reqs.length} รายการ)</span>
                              </div>
                            </div>

                            {/* Requests in Group */}
                            {isGroupExpanded && (
                              <ul className="divide-y divide-gray-50 border-t border-gray-50">
                                {reqs.map(req => renderRequestCard(req, activeTab === 'history'))}
                              </ul>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Adjust Time Modal */}
      {adjustModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">แก้ไขเวลาปฏิบัติงานจริง</h3>
              <button onClick={() => setAdjustModalReq(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                <div className="font-medium mb-1">เวลาตามคำขอเดิม:</div>
                <div>{format(new Date(adjustModalReq.start_time), 'HH:mm')} - {format(new Date(adjustModalReq.end_time), 'HH:mm')} น. (รวม {adjustModalReq.total_hours} ชม.)</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่มต้นจริง</label>
                  <select 
                    value={adjustStart} 
                    onChange={e => setAdjustStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t} น.</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุดจริง</label>
                  <select 
                    value={adjustEnd} 
                    onChange={e => setAdjustEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t} น.</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setAdjustModalReq(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleAdjustSubmit}
                  disabled={processingId === adjustModalReq.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
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
