'use client'

import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  Users, 
  AlertCircle,
  Clock,
  Calendar,
  CheckCheck,
  Building2,
  Filter,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react'
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
    const matchName = req.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      req.reason?.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Automatically expand all nodes on initial load for convenience
  const initialExpanded = useMemo(() => {
    const set = new Set<string>()
    Object.keys(groupedRequests).forEach(div => {
      set.add(`div-${div}`)
      Object.keys(groupedRequests[div] || {}).forEach(grp => {
        set.add(`group-${div}-${grp}`)
      })
    })
    return set
  }, [groupedRequests])

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(initialExpanded)

  const toggleNode = (nodeId: string) => {
    const next = new Set(expandedNodes)
    if (next.has(nodeId)) {
      next.delete(nodeId)
    } else {
      next.add(nodeId)
    }
    setExpandedNodes(next)
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

  const roleLabel = userRole === 'director' 
    ? 'ผู้อำนวยการกอง (ขั้นที่ 2)' 
    : userRole === 'supervisor' 
    ? 'ผู้อำนวยการกลุ่ม (ขั้นที่ 1)' 
    : isAdmin ? 'ผู้ดูแลระบบ (Admin Monitor)' : 'ผู้อนุมัติ'

  return (
    <div className="space-y-6">
      {/* Top Banner / Metric Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
              <span>สิทธิ์การอนุมัติ: {roleLabel}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              พิจารณาคำร้องขอปฏิบัติงานนอกเวลา (OT)
            </h1>
            <p className="mt-1 text-sm text-blue-100/90 max-w-xl">
              ตรวจสอบเหตุผล ความจำเป็น และอนุมัติการปฏิบัติงานนอกเวลาของเจ้าหน้าที่ในสังกัดตามขั้นตอนระเบียบราชการ
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 text-center min-w-[100px]">
              <span className="text-xs text-blue-200 block font-medium">รอพิจารณา</span>
              <span className="text-2xl font-black text-amber-300">{pendingRequests.length}</span>
              <span className="text-[10px] text-blue-200 block">รายการ</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 text-center min-w-[100px]">
              <span className="text-xs text-blue-200 block font-medium">พิจารณาแล้ว</span>
              <span className="text-2xl font-black text-emerald-300">{historyRequests.length}</span>
              <span className="text-[10px] text-blue-200 block">รายการ</span>
            </div>
            {certificationRequests !== undefined && (
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 text-center col-span-2 sm:col-span-1 min-w-[100px]">
                <span className="text-xs text-blue-200 block font-medium">รอรับรองผล</span>
                <span className="text-2xl font-black text-purple-300">{certificationRequests.length}</span>
                <span className="text-[10px] text-blue-200 block">รายการ</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="glass-panel p-1.5 rounded-2xl flex flex-wrap gap-2 items-center">
        <button
          onClick={() => { setActiveTab('pending'); setSelectedIds(new Set()); }}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'pending'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <Clock className={`w-4 h-4 ${activeTab === 'pending' ? 'text-white' : 'text-gray-400'}`} />
          <span>รายการรอพิจารณา</span>
          {pendingRequests.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'pending'
                ? 'bg-white text-blue-700'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('history'); setSelectedIds(new Set()); }}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <CheckCheck className={`w-4 h-4 ${activeTab === 'history' ? 'text-white' : 'text-gray-400'}`} />
          <span>ประวัติการพิจารณา</span>
          {historyRequests.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'history' ? 'bg-white text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {historyRequests.length}
            </span>
          )}
        </button>

        {certificationRequests !== undefined && (
          <button
            onClick={() => { setActiveTab('certification'); setSelectedIds(new Set()); }}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'certification'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${activeTab === 'certification' ? 'text-white' : 'text-gray-400'}`} />
            <span>{isAdmin ? 'ติดตามการรับรองเวลา' : 'รับรองการปฏิบัติงานจริง'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'certification' ? 'bg-white text-purple-700' : 'bg-purple-100 text-purple-800'
            }`}>
              {certificationRequests.length}
            </span>
          </button>
        )}
      </div>

      {/* Filter / Search & Bulk Actions Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-gray-200/80 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-sm"
            placeholder="ค้นหาชื่อเจ้าหน้าที่ หรือเหตุผลการขอ OT..."
          />
        </div>

        {/* History specific filters */}
        {activeTab === 'history' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 border border-gray-200/80 rounded-xl text-sm shadow-sm">
              <input
                type="checkbox"
                id="enable-date-filter"
                checked={isDateFilterEnabled}
                onChange={(e) => setIsDateFilterEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="enable-date-filter" className="text-xs text-gray-600 font-medium cursor-pointer">
                กรองเฉพาะวัน
              </label>
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                disabled={!isDateFilterEnabled}
                className="text-xs bg-transparent focus:outline-none disabled:opacity-40"
              />
            </div>

            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-200/80 rounded-xl text-xs font-medium bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>

            <MonthSelector />
          </div>
        )}

        {/* Bulk Action Controls */}
        {activeTab === 'pending' && filteredRequests.length > 0 && !isAdmin && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 shadow-sm select-none">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={selectedIds.size > 0 && selectedIds.size === filteredRequests.length}
                onChange={toggleSelectAll}
              />
              <span>เลือกทั้งหมด ({filteredRequests.length})</span>
            </label>

            {selectedIds.size > 0 && (
              <div className="inline-flex items-center gap-2 animate-fadeIn">
                <button 
                  onClick={handleBulkApprove}
                  disabled={isBulkProcessing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>อนุมัติที่เลือก ({selectedIds.size})</span>
                </button>
                <button 
                  onClick={handleBulkReject}
                  disabled={isBulkProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>ไม่อนุมัติ</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'certification' && !isAdmin ? (
        <CertificationTab 
          requests={certificationRequests || []} 
          historyRequests={certHistoryRequests || []}
          userRole={userRole} 
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800">ไม่มีรายการคำร้องที่ตรงกับเงื่อนไข</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'ยอดเยี่ยม! คุณได้พิจารณาคำร้องขอ OT ในสังกัดครบถ้วนเรียบร้อยแล้ว'
                  : 'ไม่พบประวัติคำร้องตามการค้นหาหรือช่วงเวลาที่เลือก'}
              </p>
            </div>
          ) : (
            Object.entries(groupedRequests).map(([divName, groupsMap]) => {
              const divPendingCount = Object.values(groupsMap).flat().filter(r => r.status === 'pending').length
              const divTotalCount = Object.values(groupsMap).flat().length
              const divNodeId = `div-${divName}`
              const isDivExpanded = expandedNodes.has(divNodeId)

              return (
                <div key={divNodeId} className="glass-panel rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm transition-all">
                  {/* Division Card Header */}
                  <div 
                    onClick={() => toggleNode(divNodeId)}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-white hover:from-blue-50/50 cursor-pointer select-none transition-colors border-b border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm md:text-base">{divName}</span>
                          <span className="text-xs text-gray-400 font-medium">({divTotalCount} รายการ)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {divPendingCount > 0 && activeTab === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
                          รออนุมัติ {divPendingCount}
                        </span>
                      )}
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        {isDivExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Groups Accordion List */}
                  {isDivExpanded && (
                    <div className="p-3 md:p-4 space-y-3 bg-slate-50/30">
                      {Object.entries(groupsMap).map(([groupName, reqs]) => {
                        const groupPendingCount = reqs.filter(r => r.status === 'pending').length
                        const groupNodeId = `group-${divName}-${groupName}`
                        const isGroupExpanded = expandedNodes.has(groupNodeId)

                        return (
                          <div key={groupNodeId} className="bg-white rounded-xl border border-gray-200/70 overflow-hidden shadow-xs">
                            {/* Group Header */}
                            <div 
                              onClick={() => toggleNode(groupNodeId)}
                              className="flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100/50 cursor-pointer select-none transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <Users className="w-4 h-4 text-indigo-600" />
                                <span className="font-semibold text-gray-800 text-xs md:text-sm">{groupName}</span>
                                <span className="text-xs text-gray-400">({reqs.length} รายการ)</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {groupPendingCount > 0 && activeTab === 'pending' && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                )}
                                {isGroupExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                              </div>
                            </div>

                            {/* Request Cards List inside Group */}
                            {isGroupExpanded && (
                              <div className="divide-y divide-gray-100">
                                {reqs.map((req) => {
                                  const isSelected = selectedIds.has(req.id)
                                  const reqDate = new Date(req.start_time)
                                  const thaiDateStr = `${format(reqDate, 'd MMMM', { locale: th })} ${reqDate.getFullYear() + 543}`

                                  return (
                                    <div 
                                      key={req.id} 
                                      className={`p-4 md:p-5 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                        isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                                      }`}
                                    >
                                      {/* Left: Checkbox + User Avatar + Details */}
                                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                        {activeTab === 'pending' && !isAdmin && (
                                          <div className="pt-1 shrink-0">
                                            <input 
                                              type="checkbox" 
                                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                              checked={isSelected}
                                              onChange={() => toggleSelect(req.id)}
                                            />
                                          </div>
                                        )}

                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
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

                                          {/* Reason callout */}
                                          <div className="mt-2 text-xs text-gray-700 bg-gray-50/80 border border-gray-100 rounded-lg p-2.5">
                                            <span className="font-semibold text-gray-900">เหตุผลขอ OT: </span>
                                            {req.reason}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Center / Right: Date, Time Pill, Status */}
                                      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                                        <div className="text-left md:text-right">
                                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                            <span>{thaiDateStr}</span>
                                          </div>
                                          <div className="mt-1 flex items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                              <Clock className="w-3 h-3 text-blue-500" />
                                              {format(new Date(req.start_time), 'HH:mm')} - {format(new Date(req.end_time), 'HH:mm')} น.
                                            </span>
                                            <span className="text-xs font-bold text-indigo-700">
                                              ({req.total_hours} ชม.)
                                            </span>
                                          </div>

                                          {/* History Status Pill */}
                                          {activeTab === 'history' && (
                                            <div className="mt-2 flex items-center justify-end gap-1.5">
                                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                req.status === 'approved' 
                                                  ? 'bg-emerald-100 text-emerald-800' 
                                                  : req.status === 'rejected'
                                                  ? 'bg-rose-100 text-rose-800'
                                                  : 'bg-amber-100 text-amber-800'
                                              }`}>
                                                {req.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                                                {req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'rejected' ? 'ไม่อนุมัติ' : `รอขั้นที่ ${req.current_step}`}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Action Buttons for Pending */}
                                        {activeTab === 'pending' && !isAdmin && (
                                          <div className="flex items-center gap-2">
                                            <button 
                                              onClick={() => handleApprove(req.id)}
                                              disabled={isProcessing === req.id || isBulkProcessing}
                                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                              <span>เห็นควรอนุมัติ</span>
                                            </button>
                                            <button 
                                              onClick={() => handleReject(req.id)}
                                              disabled={isProcessing === req.id || isBulkProcessing}
                                              className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                                            >
                                              <XCircle className="w-4 h-4" />
                                              <span>ไม่อนุมัติ</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
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
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
