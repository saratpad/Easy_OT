'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Download, Check, ExternalLink, X, Plus, CheckSquare, Clock, RefreshCw } from 'lucide-react'
import { createOTDocument } from '@/app/actions/admin'
import MonthSelector from '../../employee/MonthSelector'

type OTRequest = {
  id: string
  fiscal_year: string
  start_time: string
  end_time: string
  total_hours: number
  reason: string
  pdf_url: string | null
  user: {
    id: string
    full_name: string
    position: string
  }
}

type OTDocument = {
  id: string
  fiscal_year: string
  month_year: string
  doc_number: string | null
  request_ids: string[]
  format: 'pdf' | 'docx'
  doc_type: 'memo' | 'attendance'
  document_url: string | null
  line_sent: boolean
  created_at: string
  created_by_user?: { full_name: string } | null
}

type Executive = {
  id: string
  full_name: string
  position: string
  signature_url: string | null
}

type Props = {
  divisionId: string
  approvedRequests: OTRequest[]
  documents: OTDocument[]
  executives: Executive[]
}

const thMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

export default function DocumentClient({ divisionId, approvedRequests, documents, executives }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'memo' | 'attendance'>('memo')
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf')
  const [docNumber, setDocNumber] = useState('')
  
  // States for document history edit
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editDocNumber, setEditDocNumber] = useState('')
  const [editCreatedAt, setEditCreatedAt] = useState('')
  const [isProcessingDoc, setIsProcessingDoc] = useState(false)
  const [executiveId, setExecutiveId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // กรอง requests ที่ยังไม่ได้ทำเป็น PDF
  const pendingRequests = approvedRequests.filter(req => !req.pdf_url)

  const memoDocs = documents.filter(doc => doc.doc_type === 'memo')
  const attendanceDocs = documents.filter(doc => doc.doc_type === 'attendance')

  const hasPendingDocument = documents.some(doc => !doc.document_url || !doc.line_sent)

  // State for collapsible settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

  useEffect(() => {
    if (hasPendingDocument) {
      const interval = setInterval(() => {
        router.refresh()
      }, 5000) // รีเฟรชทุก 5 วินาทีถ้ายังมีเอกสารที่กำลังสร้าง
      return () => clearInterval(interval)
    }
  }, [hasPendingDocument, router])

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRequestIds(pendingRequests.map(r => r.id))
    } else {
      setSelectedRequestIds([])
    }
  }

  const handleSelect = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    if (selectedRequestIds.length === 0) {
      showToast('กรุณาเลือกคำร้องที่ต้องการออกเอกสาร', 'error')
      return
    }
    if (!executiveId) {
      showToast('กรุณาเลือกผู้บริหารที่ลงนามกำกับดูแล', 'error')
      return
    }

    setIsGenerating(true)
    try {
      const d = new Date()
      const fiscalYear = d.getMonth() >= 9 ? (d.getFullYear() + 1 + 543).toString() : (d.getFullYear() + 543).toString()
      const monthYear = `${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`
      
      // 1. Create document record in Supabase using server action
      const newDoc = await createOTDocument({
        divisionId,
        fiscalYear,
        monthYear,
        docNumber,
        requestIds: selectedRequestIds,
        format
      })

      // 2. Call the API to trigger GAS webhook
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: newDoc.id,
          executiveId,
        })
      })

      if (!res.ok) {
        throw new Error('Failed to trigger API')
      }

      showToast('เริ่มกระบวนการสร้างเอกสารแล้ว รอสักครู่ (ระบบจะแจ้งทาง LINE)', 'success')
      
      // Clear selection
      setSelectedRequestIds([])
      setDocNumber('')
      
      // Refresh page to show new document in history
      router.refresh()
      
    } catch (err) {
      console.error(err)
      showToast('เกิดข้อผิดพลาดในการสร้างเอกสาร', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }) + ' น.'
  }

  const handleReprint = async (docId: string) => {
    if (!executiveId) {
      showToast('กรุณาเลือกผู้บริหารที่ลงนามกำกับดูแล (ในส่วนตั้งค่าเอกสารด้านบน) ก่อนพิมพ์ซ้ำ', 'error')
      return
    }

    // maybe we need to set generating state per doc, but for simplicity we can use global isGenerating
    setIsGenerating(true)
    try {
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          executiveId,
          format,
        })
      })

      if (!res.ok) {
        throw new Error('Failed to trigger API')
      }

      showToast('เริ่มกระบวนการพิมพ์ซ้ำแล้ว รอสักครู่ (ระบบจะส่งไปทาง LINE ด้วย)', 'success')
      
    } catch (err) {
      console.error(err)
      showToast('เกิดข้อผิดพลาดในการพิมพ์ซ้ำ', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('คุณต้องการลบประวัติการออกเอกสารนี้ รวมถึงไฟล์ใน Google Drive ด้วยใช่หรือไม่? (คำร้องจะถูกส่งกลับไปให้รอออกเอกสารใหม่)')) return

    setIsProcessingDoc(true)
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete')
      
      showToast('ลบเอกสารสำเร็จ', 'success')
      router.refresh()
    } catch (err) {
      console.error(err)
      showToast('เกิดข้อผิดพลาดในการลบเอกสาร', 'error')
    } finally {
      setIsProcessingDoc(false)
    }
  }

  const handleSaveDoc = async (id: string) => {
    setIsProcessingDoc(true)
    try {
      // Convert editCreatedAt back to ISO string
      let newCreatedAt
      if (editCreatedAt) {
        // preserve the time from the original created_at if possible, or just use midnight UTC
        newCreatedAt = new Date(editCreatedAt).toISOString()
      }

      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docNumber: editDocNumber, createdAt: newCreatedAt })
      })
      if (!res.ok) throw new Error('Failed to update')
      
      showToast('บันทึกข้อมูลเอกสารสำเร็จ', 'success')
      setEditingDocId(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลเอกสาร', 'error')
    } finally {
      setIsProcessingDoc(false)
    }
  }

  const handleReprintAttendance = async (docId: string, monthYearStr: string, docFormat: string) => {
    setIsGenerating(true)
    try {
      const parts = monthYearStr.split(' ')
      const monthName = parts[0]
      const yearStr = parts[1]
      const monthIndex = thMonths.indexOf(monthName)
      if (monthIndex === -1 || !yearStr) {
        throw new Error('Invalid monthYear format')
      }
      const year = parseInt(yearStr) - 543
      const monthParam = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

      const res = await fetch('/api/generate-attendance-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, divisionId, month: monthParam, format: docFormat })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate')
      }
      
      const data = await res.json()
      if (data.url) {
        showToast('เริ่มกระบวนการสร้างเอกสารแล้ว รอสักครู่', 'success')
        router.refresh()
      }
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'เกิดข้อผิดพลาดในการพิมพ์ซ้ำ', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateAttendanceReport = async () => {
    setIsGenerating(true)
    try {
      const searchParams = new URLSearchParams(window.location.search)
      const month = searchParams.get('month') || new Date().toISOString().substring(0, 7) // fallback to current yyyy-MM
      
      const d = new Date(month + '-01')
      const fiscalYear = d.getMonth() >= 9 ? (d.getFullYear() + 1 + 543).toString() : (d.getFullYear() + 543).toString()
      const monthYear = `${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`

      const newDoc = await createOTDocument({
        divisionId,
        fiscalYear,
        monthYear,
        docNumber: '',
        requestIds: [],
        format,
        docType: 'attendance'
      })

      const res = await fetch('/api/generate-attendance-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: newDoc.id, divisionId, month, format })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate')
      }
      
      const data = await res.json()
      if (data.url) {
        showToast('เริ่มกระบวนการสร้างเอกสารแล้ว รอสักครู่', 'success')
        router.refresh()
      }
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'เกิดข้อผิดพลาดในการสร้างรายงาน', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">ออกเอกสาร</h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('memo')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'memo'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            บันทึกขออนุญาต OT
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            บัญชีลงเวลาและรายงานผล
          </button>
        </div>
      </div>

      {activeTab === 'memo' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Pending Requests to Generate */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <CheckSquare className="w-4 h-4 mr-2 text-blue-600" />
                คำร้องที่พร้อมออกเอกสาร ({pendingRequests.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={pendingRequests.length > 0 && selectedRequestIds.length === pendingRequests.length}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เจ้าหน้าที่</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่ทำ OT</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">จำนวน (ชม.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {pendingRequests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          checked={selectedRequestIds.includes(req.id)}
                          onChange={() => handleSelect(req.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{req.user?.full_name}</p>
                        <p className="text-xs text-gray-500">{req.user?.position}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(req.start_time)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {req.total_hours}
                      </td>
                    </tr>
                  ))}
                  {pendingRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        ไม่มีคำร้องที่พร้อมออกเอกสาร
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Generation Form */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div 
              className="px-6 py-4 flex justify-between items-center cursor-pointer bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-blue-600" />
                ตั้งค่าเอกสาร
              </h3>
              <span className="text-gray-500 text-sm">
                {isSettingsOpen ? '▼ ซ่อน' : '▲ แสดง'}
              </span>
            </div>
            
            {isSettingsOpen && (
              <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลขที่บันทึก (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="เช่น กนย.123/2568"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ผู้บริหารกำกับดูแล (ตราประทับ) <span className="text-red-500">*</span>
                </label>
                <select
                  value={executiveId}
                  onChange={(e) => setExecutiveId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- เลือกผู้บริหาร --</option>
                  {executives.map(exec => (
                    <option key={exec.id} value={exec.id}>
                      {exec.full_name} ({exec.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทไฟล์
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="pdf"
                      checked={format === 'pdf'}
                      onChange={(e) => setFormat(e.target.value as 'pdf')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">PDF</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="docx"
                      checked={format === 'docx'}
                      onChange={(e) => setFormat(e.target.value as 'docx')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Word (DOCX)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedRequestIds.length === 0 || !executiveId}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? (
                    <span className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      กำลังสร้างเอกสาร...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      สร้างเอกสาร ({selectedRequestIds.length} รายการ)
                    </span>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  ระบบจะสร้างเอกสาร, อัพโหลดขึ้น Google Drive และส่งแจ้งเตือนผ่าน LINE อัตโนมัติ
                </p>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-gray-500" />
            ประวัติการออกเอกสาร
          </h3>
          <MonthSelector />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สร้าง</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่บันทึก</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">จำนวน (รายการ)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เอกสาร</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">แจ้ง LINE</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {memoDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {editingDocId === doc.id ? (
                        <input
                          type="date"
                          value={editCreatedAt}
                          onChange={(e) => setEditCreatedAt(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formatDate(doc.created_at)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {editingDocId === doc.id ? (
                        <input
                          type="text"
                          value={editDocNumber}
                          onChange={(e) => setEditDocNumber(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        doc.doc_number || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center">
                      <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {doc.request_ids?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {doc.document_url ? (
                        <a 
                          href={doc.document_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <FileText className="w-4 h-4 mr-1.5" /> พิมพ์ล่าสุด {formatDateTime(doc.updated_at)}
                        </a>
                      ) : (
                        <span className="text-xs text-yellow-600 animate-pulse bg-yellow-50 px-2 py-1 rounded">กำลังสร้าง...</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {doc.line_sent ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-xs text-gray-400">รอส่ง</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end space-x-3">
                      {editingDocId === doc.id ? (
                        <>
                          <button
                            onClick={() => handleSaveDoc(doc.id)}
                            disabled={isProcessingDoc}
                            className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={() => setEditingDocId(null)}
                            disabled={isProcessingDoc}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium disabled:opacity-50"
                          >
                            ยกเลิก
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingDocId(doc.id)
                              setEditDocNumber(doc.doc_number || '')
                              setEditCreatedAt(doc.created_at.substring(0, 10))
                            }}
                            disabled={isProcessingDoc || isGenerating}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium disabled:opacity-50"
                          >
                            แก้ไข
                          </button>
                          <button 
                            onClick={() => handleReprint(doc.id)}
                            disabled={isGenerating || isProcessingDoc}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                          >
                            พิมพ์ซ้ำ
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={isProcessingDoc || isGenerating}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            ลบ
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {memoDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      ยังไม่มีประวัติการออกเอกสาร
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-3xl">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              ออกรายงานบัญชีลงเวลาและรายงานผลการปฏิบัติงานนอกเวลาราชการ
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ระบบจะดึงข้อมูลคำร้องที่ "อนุมัติแล้ว" ทั้งหมดในเดือนที่เลือกมาจัดทำรายงาน
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-6">
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลือกเดือน/ปี
                </label>
                <MonthSelector />
              </div>
              
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทไฟล์
                </label>
                <div className="flex space-x-4 h-10 items-center">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="pdf"
                      checked={format === 'pdf'}
                      onChange={(e) => setFormat(e.target.value as 'pdf')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">PDF</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="docx"
                      checked={format === 'docx'}
                      onChange={(e) => setFormat(e.target.value as 'docx')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Word (DOCX)</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateAttendanceReport}
              disabled={isGenerating}
              className="flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  กำลังสร้างรายงาน...
                </span>
              ) : (
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  สร้างรายงาน
                </span>
              )}
            </button>
          </div>
          
          {/* History for Attendance Reports */}
          <div className="mt-8">
            <h3 className="font-semibold text-gray-800 flex items-center mb-4">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              ประวัติการออกรายงานบัญชีลงเวลา
            </h3>
            
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สร้าง</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เดือน/ปี ของรายงาน</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เอกสาร</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {attendanceDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {doc.month_year}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {doc.document_url ? (
                            <a 
                              href={doc.document_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              <FileText className="w-4 h-4 mr-1.5" /> รายงานประจำเดือน {doc.month_year} พิมพ์ล่าสุด {formatDateTime(doc.updated_at || doc.created_at)}
                            </a>
                          ) : (
                            <span className="text-xs text-yellow-600 animate-pulse bg-yellow-50 px-2 py-1 rounded">กำลังสร้าง...</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end space-x-3">
                          <button 
                            onClick={() => handleReprintAttendance(doc.id, doc.month_year, doc.format || 'pdf')}
                            disabled={isGenerating || isProcessingDoc}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                          >
                            พิมพ์ซ้ำ
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={isProcessingDoc || isGenerating}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                    {attendanceDocs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          ยังไม่มีประวัติการออกรายงานบัญชีลงเวลา
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
