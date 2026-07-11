'use client'

import { CheckCircle, XCircle, Search, ChevronRight, ChevronDown, Folder, Users, AlertCircle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { updateOTRequestStatus } from '@/app/actions/ot_requests'
import MonthSelector from '../employee/MonthSelector'
import CertificationTab from './CertificationTab'

type OTRequest = {
  id: string
  start_time: string
  end_time: string
  total_hours: number
  reason: string
  status: string
  current_step: number
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

export default function ApproverClient({ 
  pendingRequests, 
  historyRequests,
  certificationRequests,
  certHistoryRequests,
  isAdmin = false,
  userRole
}: { 
  pendingRequests: OTRequest[], 
  historyRequests: OTRequest[],
  certificationRequests?: OTRequest[],
  certHistoryRequests?: OTRequest[],
  isAdmin?: boolean,
  userRole?: string
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'certification'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all')
  const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(false)
  const [historyDateFilter, setHistoryDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  const requests = activeTab === 'pending' ? pendingRequests : activeTab === 'history' ? historyRequests : (certificationRequests || [])

  const filteredRequests = requests.filter(req => {
    const matchName = req.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchName) return false

    if (activeTab === 'history') {
      if (historyStatusFilter !== 'all' && req.status !== historyStatusFilter) return false
      
      if (isDateFilterEnabled && historyDateFilter) {
        const reqDateStr = format(new Date(req.start_time), 'yyyy-MM-dd')
        if (reqDateStr !== historyDateFilter) return false
      }
    }

    return true
  })

  const groupedRequests = useMemo(() => {
    const grouped: Record<string, Record<string, OTRequest[]>> = {}
    for (const req of filteredRequests) {
      const getObjName = (obj: any) => {
        if (!obj) return null
        if (Array.isArray(obj)) return obj[0]?.name
        return obj.name
      }
      
      const divName = getObjName(req.division) || getObjName((req as any).divisions) || 'ไม่มีกอง'
      const groupName = getObjName(req.group) || getObjName((req as any).groups) || 'ไม่สังกัดกลุ่ม'

      if (!grouped[divName]) grouped[divName] = {}
      if (!grouped[divName][groupName]) grouped[divName][groupName] = []
      grouped[divName][groupName].push(req)
    }
    return grouped
  }, [filteredRequests])

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (nodeId: string) => {
    const next = new Set(expandedNodes)
    if (next.has(nodeId)) {
      next.delete(nodeId)
    } else {
      next.add(nodeId)
    }
    setExpandedNodes(next)
  }

  // Helpers to get unreviewed count
  const getPendingCountForGroup = (divName: string, groupName: string) => {
    if (activeTab === 'pending') {
      return groupedRequests[divName]?.[groupName]?.filter(r => r.status === 'pending').length || 0
    }
    if (activeTab === 'certification') {
      // In certification tab, ALL grouped requests are pending certification, 
      // because we only pass `is_certified = false` requests here.
      return groupedRequests[divName]?.[groupName]?.length || 0
    }
    return 0
  }

  const getPendingCountForDivision = (divName: string) => {
    if (activeTab === 'pending') {
      return Object.values(groupedRequests[divName] || {}).flat().filter(r => r.status === 'pending').length
    }
    if (activeTab === 'certification') {
      return Object.values(groupedRequests[divName] || {}).flat().length
    }
    return 0
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)))
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm('ยืนยันการอนุมัติคำร้องนี้?')) return
    setIsProcessing(id)
    try {
      await updateOTRequestStatus(id, 'approved', 'เห็นควรอนุมัติ')
    } catch (error) {
      console.error(error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติ:')
    if (reason === null) return // cancelled
    
    setIsProcessing(id)
    try {
      await updateOTRequestStatus(id, 'rejected', reason)
    } catch (error) {
      console.error(error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธ')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`ยืนยันการอนุมัติ ${selectedIds.size} รายการ?`)) return
    setIsBulkProcessing(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateOTRequestStatus(id, 'approved', 'เห็นควรอนุมัติ'))
      )
      setSelectedIds(new Set())
    } catch (error) {
      console.error(error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return
    const reason = prompt(`กรุณาระบุเหตุผลที่ไม่อนุมัติสำหรับ ${selectedIds.size} รายการ:`)
    if (reason === null) return
    setIsBulkProcessing(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateOTRequestStatus(id, 'rejected', reason))
      )
      setSelectedIds(new Set())
    } catch (error) {
      console.error(error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธ')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">แดชบอร์ดผู้อนุมัติ</h2>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบและอนุมัติคำร้องขอ OT จากเจ้าหน้าที่ในสังกัด</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
             onClick={() => { setActiveTab('pending'); setSelectedIds(new Set()); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            รายการรออนุมัติ
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-600 py-0.5 px-2.5 rounded-full text-xs">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('history'); setSelectedIds(new Set()); }}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ประวัติการอนุมัติ
          </button>
          {certificationRequests !== undefined && (
            <button
              onClick={() => { setActiveTab('certification'); setSelectedIds(new Set()); }}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'certification'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {isAdmin ? 'ติดตามการรับรอง' : 'รับรองการปฏิบัติงาน'}
              <span className="ml-2 bg-purple-100 text-purple-600 py-0.5 px-2.5 rounded-full text-xs">
                {certificationRequests.length}
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Filter / Search & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="ค้นหาชื่อผู้ขอ..."
          />
        </div>

        {activeTab === 'pending' && filteredRequests.length > 0 && !isAdmin && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 mr-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                checked={selectedIds.size === filteredRequests.length}
                onChange={toggleSelectAll}
              />
              เลือกทั้งหมด
            </label>
            <button 
              onClick={handleBulkApprove}
              disabled={selectedIds.size === 0 || isBulkProcessing}
              className="inline-flex justify-center items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              อนุมัติที่เลือก ({selectedIds.size})
            </button>
            <button 
              onClick={handleBulkReject}
              disabled={selectedIds.size === 0 || isBulkProcessing}
              className="inline-flex justify-center items-center px-3 py-1.5 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              ปฏิเสธที่เลือก
            </button>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 border border-gray-300 rounded-lg">
              <input
                type="checkbox"
                id="enable-date-filter"
                checked={isDateFilterEnabled}
                onChange={(e) => setIsDateFilterEnabled(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
              />
              <label htmlFor="enable-date-filter" className="text-sm text-gray-700 cursor-pointer">ค้นหาด้วยวันที่</label>
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                disabled={!isDateFilterEnabled}
                className="ml-2 text-sm bg-transparent focus:outline-none disabled:opacity-50"
              />
            </div>
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
            <MonthSelector />
          </div>
        )}
      </div>

      {activeTab === 'certification' && !isAdmin ? (
        <CertificationTab 
          requests={certificationRequests || []} 
          historyRequests={certHistoryRequests || []}
          userRole={userRole} 
        />
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col xl:flex-row min-h-[600px]">
          {/* List Section */}
          <div className="flex-1 min-w-0 border-r border-gray-100">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ไม่มีรายการคำร้อง
              </div>
            ) : (
              Object.entries(groupedRequests).map(([divName, groupsMap]) => {
                const divPendingCount = getPendingCountForDivision(divName)
                const divNodeId = `div-${divName}`
                const isDivExpanded = expandedNodes.has(divNodeId)

                return (
                  <div key={divNodeId} className="w-full">
                    {/* Division Header */}
                    <div 
                      onClick={() => toggleNode(divNodeId)}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isDivExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        <Folder className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-gray-800">{divName}</span>
                      </div>
                      {divPendingCount > 0 && (
                        <span className="flex h-5 items-center px-2 text-xs font-bold text-white bg-red-500 rounded-full">
                          {divPendingCount}
                        </span>
                      )}
                    </div>

                    {/* Groups */}
                    {isDivExpanded && (
                      <div className="divide-y divide-gray-50 border-t border-gray-100 bg-white">
                        {Object.entries(groupsMap).map(([groupName, reqs]) => {
                          const groupPendingCount = getPendingCountForGroup(divName, groupName)
                          const groupNodeId = `group-${divName}-${groupName}`
                          const isGroupExpanded = expandedNodes.has(groupNodeId)

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
                                {groupPendingCount > 0 && (
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                )}
                              </div>

                              {/* Requests in Group */}
                              {isGroupExpanded && (
                                <ul className="divide-y divide-gray-50 border-t border-gray-50">
                                  {reqs.map(req => (
                                    <li key={req.id} className="p-4 pl-16 hover:bg-gray-50/50 transition-colors flex flex-col xl:flex-row gap-4 items-start">
                                      {/* Checkbox */}
                                      {activeTab === 'pending' && !isAdmin && (
                                        <div className="pt-1 shrink-0">
                                          <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                                            checked={selectedIds.has(req.id)}
                                            onChange={() => toggleSelect(req.id)}
                                          />
                                        </div>
                                      )}

                                      <div className="flex justify-between items-start gap-4 flex-1">
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
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                          <div className="text-sm font-medium text-gray-900">
                                            {`${format(new Date(req.start_time), 'dd MMM', { locale: th })} ${new Date(req.start_time).getFullYear() + 543}`} 
                                          </div>
                                          
                                          <div className="flex items-center gap-2 justify-end w-full">
                                            <div className="text-xs text-gray-500">
                                              {format(new Date(req.start_time), 'HH:mm')} - {format(new Date(req.end_time), 'HH:mm')} น. ({req.total_hours} ชม.)
                                            </div>
                                            {activeTab === 'history' && (
                                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                                                req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-orange-50 text-orange-700 border-orange-200'
                                              }`}>
                                                {req.status === 'approved' ? 'อนุมัติแล้ว' : 
                                                 req.status === 'rejected' ? 'ไม่อนุมัติ' : 
                                                 `รออนุมัติขั้นต่อไป (ขั้นที่ ${req.current_step})`}
                                              </span>
                                            )}
                                          </div>

                                          {activeTab === 'history' && req.status === 'approved' && (
                                            <div className="flex items-center gap-2 justify-end w-full mt-1">
                                              <div className="text-xs">
                                                {req.is_worked === false ? (
                                                  <span className="text-red-600">ไม่ได้ปฏิบัติงาน (0 ชม.)</span>
                                                ) : (req.actual_start_time && req.actual_end_time) ? (
                                                  <span className="text-gray-600">
                                                    ปฏิบัติงานจริง: {format(new Date(req.actual_start_time), 'HH:mm')} - {format(new Date(req.actual_end_time), 'HH:mm')} น. ({req.actual_total_hours} ชม.)
                                                  </span>
                                                ) : null}
                                              </div>
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
                                      
                                      {activeTab === 'pending' && !isAdmin && (
                                        <div className="flex gap-2 shrink-0 xl:ml-4">
                                          <button 
                                            onClick={() => handleApprove(req.id)}
                                            disabled={isProcessing === req.id || isBulkProcessing}
                                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                                            title="อนุมัติ"
                                          >
                                            <CheckCircle className="w-5 h-5" />
                                          </button>
                                          <button 
                                            onClick={() => handleReject(req.id)}
                                            disabled={isProcessing === req.id || isBulkProcessing}
                                            className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                                            title="ไม่อนุมัติ"
                                          >
                                            <XCircle className="w-5 h-5" />
                                          </button>
                                        </div>
                                      )}
                                      
                                      {((activeTab === 'pending' && isAdmin) || activeTab === 'certification') && (
                                        <div className="mt-2 xl:mt-0 xl:ml-4">
                                          {activeTab === 'certification' ? (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                                              req.certification_step === 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                              req.certification_step === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                              {req.certification_step === 0 ? 'รอ ผอ.กลุ่ม รับรอง' :
                                               req.certification_step === 1 ? 'รอ ผอ.กอง รับรอง' : 'ไม่ทราบสถานะ'}
                                            </span>
                                          ) : (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                                              req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                              req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                              'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                              {req.status === 'approved' ? 'อนุมัติแล้ว' : 
                                              req.status === 'rejected' ? 'ไม่อนุมัติ' : 
                                              `รออนุมัติขั้นต่อไป (ขั้นที่ ${req.current_step})`}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
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
        </div>
      )}
    </div>
  )
}
