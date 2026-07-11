'use client'

import { useState } from 'react'
import { Save, Upload, X, CheckCircle, AlertCircle, Link2, Link2Off } from 'lucide-react'
import { updateMyProfile, unlinkMyLine } from '@/app/actions/profile'

type Props = {
  user: {
    id: string
    full_name: string
    position: string
    username?: string | null
    signature_url?: string | null
    role: string
    division?: { name: string }
    group?: { name: string }
    line_uid?: string | null
  }
}

export default function ProfileClient({ user }: Props) {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    position: user.position || '',
    username: user.username || '',
    password: '',
    signature_url: user.signature_url || '',
  })
  
  const [saving, setSaving] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [lineUid, setLineUid] = useState(user.line_uid || null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUnlinkLine = async () => {
    if (!confirm('คุณต้องการยกเลิกการเชื่อมต่อกับ LINE ใช่หรือไม่?')) return
    setUnlinking(true)
    try {
      await unlinkMyLine()
      setLineUid(null)
      showToast('ยกเลิกการเชื่อมต่อ LINE สำเร็จ', 'success')
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ', 'error')
    } finally {
      setUnlinking(false)
    }
  }

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)

      const res = await fetch('/api/upload-signature', {
        method: 'POST',
        body: uploadData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      
      setFormData(prev => ({ ...prev, signature_url: data.url }))
      showToast('อัปโหลดรูปลายเซ็นสำเร็จ', 'success')
    } catch (err: any) {
      console.error('Signature upload error:', err)
      showToast(`เกิดข้อผิดพลาด: ${err.message || 'ไม่ทราบสาเหตุ'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim()) {
      showToast('กรุณาระบุชื่อ-นามสกุล', 'error')
      return
    }
    
    setSaving(true)
    try {
      await updateMyProfile({
        full_name: formData.full_name,
        position: formData.position,
        username: formData.username || undefined,
        password: formData.password || undefined,
        signature_url: formData.signature_url || null,
      })
      
      setFormData(prev => ({ ...prev, password: '' })) // Clear password after save
      showToast('อัปเดตข้อมูลส่วนตัวสำเร็จ', 'success')
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {toast && (
        <div className={`p-4 flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
      
      <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
        
        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">ข้อมูลทั่วไป</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                value={formData.position} 
                onChange={e => setFormData({...formData, position: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">กอง</label>
              <input 
                type="text" 
                disabled
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                value={user.division?.name || 'ไม่ระบุกอง'} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่ม</label>
              <input 
                type="text" 
                disabled
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                value={user.group?.name || 'ไม่ระบุกลุ่ม'} 
              />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">ลายเซ็นอิเล็กทรอนิกส์</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-auto min-w-[200px] h-24 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center p-2 relative">
              {formData.signature_url ? (
                <>
                  <img src={formData.signature_url} alt="ลายเซ็น" className="max-h-full max-w-full object-contain" />
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, signature_url: ''})} 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                    title="ลบลายเซ็น"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <span className="text-sm text-gray-400 italic">ยังไม่มีลายเซ็น</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                <Upload className="w-4 h-4 mr-2" /> 
                {saving ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปลายเซ็น'}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  className="hidden" 
                  onChange={handleUploadSignature} 
                  disabled={saving}
                />
              </label>
              <p className="text-xs text-gray-500">รองรับไฟล์ PNG (โปร่งใส) หรือ JPG ขนาดไม่ควรเกิน 2MB</p>
            </div>
          </div>
        </div>

        {/* Login Credentials */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">ข้อมูลเข้าสู่ระบบ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})}
                placeholder="ระบุชื่อผู้ใช้งาน (หากต้องการ)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่ (หากต้องการเปลี่ยน)</label>
              <input 
                type="password" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยน"
              />
            </div>
          </div>
        </div>

        {/* LINE Connection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">การเชื่อมต่อบัญชี LINE</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lineUid ? 'bg-green-50 text-[#06C755]' : 'bg-gray-100 text-gray-400'}`}>
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {lineUid ? 'เชื่อมต่อกับ LINE แล้ว' : 'ยังไม่ได้เชื่อมต่อกับ LINE'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {lineUid 
                    ? `LINE User ID: ${lineUid.slice(0, 8)}... (ใช้สำหรับรับการแจ้งเตือน)`
                    : 'เชื่อมต่อบัญชีกับ LINE เพื่อความสะดวกในการเข้าสู่ระบบและการแจ้งเตือน'
                  }
                </p>
              </div>
            </div>

            {lineUid ? (
              <button
                type="button"
                onClick={handleUnlinkLine}
                disabled={unlinking}
                className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors flex items-center gap-1.5 self-start sm:self-center disabled:opacity-50"
              >
                <Link2Off className="w-3.5 h-3.5" />
                {unlinking ? 'กำลังยกเลิก...' : 'ยกเลิกการเชื่อมต่อ LINE'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/api/auth/line/login'
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#06C755] rounded-lg hover:bg-[#05b34c] transition-colors flex items-center gap-1.5 self-start sm:self-center"
              >
                <Link2 className="w-3.5 h-3.5" />
                เชื่อมต่อบัญชี LINE
              </button>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button 
            type="submit"
            disabled={saving || !formData.full_name.trim()} 
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </form>
    </div>
  )
}
