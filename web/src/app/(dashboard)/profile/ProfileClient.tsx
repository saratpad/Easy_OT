'use client'

import { useState } from 'react'
import { 
  Save, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Link2, 
  Link2Off, 
  User, 
  Building2, 
  Users, 
  Key, 
  FileSignature, 
  ShieldCheck,
  Shield,
  FileText,
  Trash2,
  Download,
  Eye,
  Ban,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { updateMyProfile, unlinkMyLine } from '@/app/actions/profile'
import { withdrawLineConsent, submitDataDeletionRequest } from '@/app/actions/consent'

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

const ROLE_DISPLAY: Record<string, string> = {
  employee: 'เจ้าหน้าที่ผู้ปฏิบัติงาน',
  supervisor: 'ผู้อำนวยการกลุ่ม (ขั้นที่ 1)',
  director: 'ผู้อำนวยการกอง (ขั้นที่ 2)',
  executive: 'ผู้บริหารระดับสูง',
  sub_admin: 'ผู้ดูแลระบบประจำกอง',
  super_admin: 'ผู้ดูแลระบบส่วนกลาง (Super Admin)',
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

  // PDPA / DSR State
  const [showPdpaSection, setShowPdpaSection] = useState(false)
  const [dsrType, setDsrType] = useState('')
  const [dsrReason, setDsrReason] = useState('')
  const [dsrSubmitting, setDsrSubmitting] = useState(false)
  const [dsrSuccess, setDsrSuccess] = useState(false)
  const [withdrawingLine, setWithdrawingLine] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
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

  const handleWithdrawLineConsent = async () => {
    if (!confirm('คุณต้องการถอนความยินยอมการใช้ LINE UID ใช่หรือไม่?\n\nหมายเหตุ: การถอนความยินยอมจะไม่ส่งผลให้บัญชีถูกลบทันที แต่จะบันทึกคำร้องไว้เพื่อให้ผู้ดูแลระบบดำเนินการ')) return
    setWithdrawingLine(true)
    try {
      await withdrawLineConsent()
      showToast('บันทึกการถอนความยินยอมสำเร็จ ผู้ดูแลระบบจะดำเนินการต่อ', 'success')
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setWithdrawingLine(false)
    }
  }

  const handleDsrSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dsrType) return
    setDsrSubmitting(true)
    try {
      await submitDataDeletionRequest(`[${dsrType}] ${dsrReason}`)
      setDsrSuccess(true)
      setDsrType('')
      setDsrReason('')
      showToast('ส่งคำร้องสำเร็จ ผู้ดูแลระบบจะติดต่อกลับภายใน 30 วัน', 'success')
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการส่งคำร้อง', 'error')
    } finally {
      setDsrSubmitting(false)
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
      
      setFormData(prev => ({ ...prev, password: '' }))
      showToast('บันทึกการเปลี่ยนแปลงข้อมูลส่วนตัวสำเร็จ', 'success')
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error')
    } finally {
      setSaving(false)
    }
  }

  const roleTitle = ROLE_DISPLAY[user.role] || user.role

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-fadeIn ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      {/* User Header Profile Card */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-extrabold text-3xl shadow-lg shadow-blue-500/25 shrink-0 ring-4 ring-white">
          {formData.full_name?.charAt(0) || 'U'}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {formData.full_name || 'ไม่ระบุชื่อ'}
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {roleTitle}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-1 font-medium">
            {formData.position || 'ยังไม่ระบุตำแหน่ง'}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1 bg-gray-100/80 px-2.5 py-1 rounded-lg">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              {user.division?.name || 'กองประสานนโยบายและยุทธศาสตร์'}
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-100/80 px-2.5 py-1 rounded-lg">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {user.group?.name || 'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: General Info */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-base">ข้อมูลทั่วไปของบุคลากร</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                ชื่อ-นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                required 
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all shadow-xs"
                placeholder="นาย/นาง/นางสาว..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">ตำแหน่ง</label>
              <input 
                type="text" 
                value={formData.position} 
                onChange={e => setFormData({...formData, position: e.target.value})} 
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all shadow-xs"
                placeholder="เช่น นักวิเคราะห์นโยบายและแผนปฏิบัติการ"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">สังกัดกอง</label>
              <input 
                type="text" 
                disabled
                value={user.division?.name || 'กองประสานนโยบายและยุทธศาสตร์'} 
                className="w-full px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed select-none"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">แก้ไขโดยผู้ดูแลระบบ</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">สังกัดกลุ่ม / ฝ่าย</label>
              <input 
                type="text" 
                disabled
                value={user.group?.name || 'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑'} 
                className="w-full px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed select-none"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">แก้ไขโดยผู้ดูแลระบบ</span>
            </div>
          </div>
        </div>

        {/* Section 2: Electronic Signature */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <FileSignature className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-base">ลายเซ็นอิเล็กทรอนิกส์ (Digital Signature)</h3>
          </div>

          <p className="text-xs text-gray-500">
            ลายเซ็นนี้จะถูกนำไปใช้ในเอกสารขออนุมัติ OT และรายงานการปฏิบัติงานจริงตามระเบียบ
          </p>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
            <div className="w-56 h-28 bg-white border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center p-3 relative group overflow-hidden shadow-xs">
              {formData.signature_url ? (
                <>
                  <img src={formData.signature_url} alt="ลายเซ็น" className="max-h-full max-w-full object-contain" />
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, signature_url: ''})} 
                    className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-md transition-all"
                    title="ลบลายเซ็น"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <FileSignature className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                  <span className="text-xs text-gray-400 font-medium">ยังไม่มีลายเซ็น</span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl cursor-pointer transition-all shadow-xs">
                <Upload className="w-4 h-4" /> 
                <span>{saving ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปลายเซ็น'}</span>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  className="hidden" 
                  onChange={handleUploadSignature} 
                  disabled={saving}
                />
              </label>
              <p className="text-[11px] text-gray-400">
                แนะนำไฟล์ PNG พื้นหลังโปร่งใส (Transparent) ขนาดไม่เกิน 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Credentials */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Key className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 text-base">ความปลอดภัย & การเข้าสู่ระบบ</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">ชื่อผู้ใช้งาน (Username)</label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all shadow-xs"
                placeholder="ระบุชื่อผู้ใช้งาน"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">รหัสผ่านใหม่ (หากต้องการเปลี่ยน)</label>
              <input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all shadow-xs"
                placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยน"
              />
            </div>
          </div>
        </div>

        {/* Section 4: LINE Integration */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Link2 className="w-5 h-5 text-[#06C755]" />
            <h3 className="font-bold text-gray-900 text-base">การเชื่อมต่อบัญชี LINE</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-xs ${
                lineUid ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                LINE
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">
                    {lineUid ? 'เชื่อมต่อกับ LINE เรียบร้อย' : 'ยังไม่ได้เชื่อมต่อกับ LINE'}
                  </p>
                  {lineUid && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {lineUid 
                    ? `LINE User ID: ${lineUid.slice(0, 10)}... (รับการแจ้งเตือนผลอนุมัติแบบเรียลไทม์)`
                    : 'เชื่อมต่อบัญชีเพื่อรับการแจ้งเตือนผลอนุมัติ OT และลงชื่อเข้าใช้สะดวกรวดเร็ว'
                  }
                </p>
              </div>
            </div>

            {lineUid ? (
              <button
                type="button"
                onClick={handleUnlinkLine}
                disabled={unlinking}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-all self-start sm:self-center disabled:opacity-50"
              >
                <Link2Off className="w-3.5 h-3.5" />
                <span>{unlinking ? 'กำลังยกเลิก...' : 'ยกเลิกการเชื่อมต่อ'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/api/auth/line/login'
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-md shadow-[#06C755]/20 transition-all self-start sm:self-center"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>เชื่อมต่อ LINE ทันที</span>
              </button>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end pt-2">
          <button 
            type="submit"
            disabled={saving || !formData.full_name.trim()} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการเปลี่ยนแปลง'}</span>
          </button>
        </div>
      </form>

      {/* ─── Section 5: PDPA / สิทธิ์ข้อมูลส่วนบุคคล ─────────────────────── */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* Header — คลิกเพื่อ toggle */}
        <button
          type="button"
          onClick={() => setShowPdpaSection(v => !v)}
          className="w-full flex items-center gap-3 p-6 text-left hover:bg-slate-50/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base">สิทธิ์ข้อมูลส่วนบุคคล (PDPA)</h3>
            <p className="text-xs text-gray-500 mt-0.5">ถอนความยินยอม • ขอเข้าถึง/แก้ไข/ลบข้อมูล • ดูนโยบาย</p>
          </div>
          {showPdpaSection
            ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
        </button>

        {showPdpaSection && (
          <div className="px-6 pb-6 space-y-5 border-t border-gray-100">

            {/* ข้อมูลที่ระบบเก็บ */}
            <div className="mt-5">
              <p className="text-xs font-bold text-gray-700 mb-3">ข้อมูลส่วนบุคคลที่ระบบเก็บรวบรวมจากท่าน</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { label: 'ชื่อ-นามสกุล', basis: 'ภารกิจราชการ' },
                  { label: 'ตำแหน่งงาน / กอง / สำนัก', basis: 'ภารกิจราชการ' },
                  { label: 'LINE UID', basis: 'ความยินยอม' },
                  { label: 'ข้อมูลการทำงาน OT (วัน/เวลา/เหตุผล)', basis: 'ภารกิจราชการ' },
                  { label: 'ลายมือชื่ออิเล็กทรอนิกส์', basis: 'ความยินยอม' },
                  { label: 'Username / Password (bcrypt)', basis: 'ภารกิจราชการ' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Check className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{item.label}</p>
                      <p className="text-[10px] text-slate-500">{item.basis}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ถอนความยินยอม LINE */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-800">ถอนความยินยอม — LINE UID (มาตรา 19)</p>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                LINE UID ถูกเก็บโดยอาศัยความยินยอมของท่าน ท่านสามารถถอนความยินยอมได้ทุกเมื่อ
                การถอนจะไม่ส่งผลต่อการประมวลผลที่เกิดขึ้นก่อนหน้า และอาจทำให้ท่านไม่ได้รับการแจ้งเตือนผ่าน LINE
              </p>
              <button
                type="button"
                onClick={handleWithdrawLineConsent}
                disabled={withdrawingLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <Ban className="w-3 h-3" />
                {withdrawingLine ? 'กำลังบันทึก...' : 'ถอนความยินยอม LINE UID'}
              </button>
            </div>

            {/* DSR Request Form */}
            <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                <p className="text-xs font-bold text-slate-800">ยื่นคำร้องขอใช้สิทธิ์ (มาตรา 30–41)</p>
              </div>

              {dsrSuccess ? (
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">ส่งคำร้องสำเร็จแล้ว</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">ผู้ดูแลระบบจะดำเนินการภายใน 30 วันตาม PDPA มาตรา 43</p>
                    <button onClick={() => setDsrSuccess(false)} className="text-[11px] text-emerald-600 underline mt-1">ยื่นคำร้องใหม่</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleDsrSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">ประเภทคำร้อง <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={dsrType}
                      onChange={e => setDsrType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none bg-white"
                    >
                      <option value="">-- เลือกประเภทคำร้อง --</option>
                      <option value="access">ขอเข้าถึง / สำเนาข้อมูล (ม.30)</option>
                      <option value="rectification">ขอแก้ไขข้อมูลให้ถูกต้อง (ม.35)</option>
                      <option value="erasure">ขอลบ / ทำลายข้อมูล (ม.33)</option>
                      <option value="restriction">ขอระงับการใช้ข้อมูล (ม.34)</option>
                      <option value="objection">คัดค้านการประมวลผล (ม.37)</option>
                      <option value="portability">ขอรับข้อมูลในรูปแบบดิจิทัล (ม.36)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">เหตุผล / รายละเอียดเพิ่มเติม</label>
                    <textarea
                      value={dsrReason}
                      onChange={e => setDsrReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none bg-white resize-none"
                      placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม (ถ้ามี)"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      ผู้ดูแลระบบจะตอบกลับภายใน 30 วัน<br/>ตาม พ.ร.บ. PDPA มาตรา 43
                    </p>
                    <button
                      type="submit"
                      disabled={dsrSubmitting || !dsrType}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md shadow-violet-500/20 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {dsrSubmitting ? 'กำลังส่ง...' : 'ส่งคำร้อง'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ลิงก์ Privacy Policy */}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              อ่านนโยบายคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy) ฉบับเต็ม
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
