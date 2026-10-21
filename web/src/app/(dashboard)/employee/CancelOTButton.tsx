'use client'

import { useState } from 'react'
import { cancelOTRequest } from '@/app/actions/ot_requests'
import { Trash2 } from 'lucide-react'

export default function CancelOTButton({ requestId }: { requestId: string }) {
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำร้องนี้?')) return
    setIsCancelling(true)
    try {
      await cancelOTRequest(requestId)
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการยกเลิกคำร้อง')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isCancelling}
      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 rounded-lg transition-all active:scale-95 disabled:opacity-50"
      title="ยกเลิกคำร้อง"
    >
      <Trash2 className="w-3.5 h-3.5" />
      <span>{isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิก'}</span>
    </button>
  )
}
