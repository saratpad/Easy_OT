'use client'

import { useState } from 'react'
import { cancelOTRequest } from '@/app/actions/ot_requests'
import { XCircle } from 'lucide-react'

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
      className="ml-2 inline-flex items-center justify-center p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
      title="ยกเลิกคำร้อง"
    >
      <XCircle className="w-4 h-4" />
    </button>
  )
}
