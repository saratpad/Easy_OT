import re
import sys

with open('src/app/(dashboard)/approver/CertificationTab.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { certifyBySupervisor, reviewByDirector } from '@/app/actions/certification'",
    "import { certifyBySupervisor, reviewByDirector, bulkCertifyBySupervisor, bulkNotWorkedBySupervisor, bulkReviewByDirector } from '@/app/actions/certification'"
)

# 2. Add state and handlers
state_code = """
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

"""
content = content.replace(
    "  const currentRequests = activeTab === 'pending' ? requests : historyRequests",
    state_code + "  const currentRequests = activeTab === 'pending' ? requests : historyRequests"
)

# 3. Add checkbox to renderRequestCard
card_start = """    return (
      <div key={req.id} className="p-4 pl-16 hover:bg-gray-50/50 transition-colors flex flex-col xl:flex-row gap-4 items-start">
        <div className="flex justify-between items-start gap-4 flex-1">"""
        
card_replacement = """    return (
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
        <div className={`flex justify-between items-start gap-4 flex-1 ${!isHistory ? 'ml-2' : 'ml-4'}`}>"""

content = content.replace(card_start, card_replacement)

# 4. Add action bar
tab_bar = """      <div className="flex items-center border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          รอรับรอง ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          ประวัติการรับรอง
        </button>
      </div>"""

tab_bar_replacement = """      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 bg-gray-50/50">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            รอรับรอง ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            ประวัติการรับรอง
          </button>
        </div>
        {activeTab === 'pending' && requests.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={selectedIds.size === requests.length && requests.length > 0} onChange={handleSelectAll} className="rounded text-primary focus:ring-primary w-4 h-4" />
              เลือกทั้งหมด
            </label>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 pl-3 border-l border-gray-300">
                <button onClick={() => handleBulkAction('certify')} disabled={isBulkProcessing} className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary-dark disabled:opacity-50">รับรองที่เลือก</button>
                {userRole === 'director' ? (
                  <>
                    <button onClick={() => handleBulkAction('revise')} disabled={isBulkProcessing} className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded border border-amber-200 hover:bg-amber-200 disabled:opacity-50">แจ้งปรับปรุงที่เลือก</button>
                    <button onClick={() => handleBulkAction('reject')} disabled={isBulkProcessing} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded border border-red-200 hover:bg-red-200 disabled:opacity-50">ปฏิเสธที่เลือก</button>
                  </>
                ) : (
                  <button onClick={() => handleBulkAction('not_worked')} disabled={isBulkProcessing} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded border border-gray-200 hover:bg-gray-200 disabled:opacity-50">ปฏิเสธที่เลือก (0 ชม.)</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>"""

content = content.replace(tab_bar, tab_bar_replacement)

with open('src/app/(dashboard)/approver/CertificationTab.tsx', 'w') as f:
    f.write(content)

print("Patched CertificationTab.tsx")
