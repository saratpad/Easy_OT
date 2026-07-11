'use client'

import { useState, useRef } from 'react'
import { Save, Check, X, Palette, Type, Image, MessageSquare, Eye, Upload } from 'lucide-react'
import { updateSystemSetting } from '@/app/actions/admin'

type Props = {
  settings: Record<string, string>
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {message}
    </div>
  )
}

const PRESET_COLORS = [
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Slate', value: '#475569' },
]

export default function SettingsClient({ settings }: Props) {
  const [appName, setAppName] = useState(settings.app_name || 'Easy OT')
  const [logoUrl, setLogoUrl] = useState(settings.logo_url || '')
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || '#2563eb')
  const [accentColor, setAccentColor] = useState(settings.accent_color || '#3b82f6')
  const [announcement, setAnnouncement] = useState(settings.login_announcement || '')
  const [announcementType, setAnnouncementType] = useState(settings.announcement_type || 'info')
  const [announcementFormat, setAnnouncementFormat] = useState(settings.announcement_format || 'text')
  const [announcementImageUrl, setAnnouncementImageUrl] = useState(settings.announcement_image_url || '')
  const [announcementShowAt, setAnnouncementShowAt] = useState(settings.announcement_show_at || 'before_login')
  const [announcementActive, setAnnouncementActive] = useState(settings.announcement_active !== 'false')
  
  // Work Certification
  const [enableWorkCertification, setEnableWorkCertification] = useState(settings.enable_work_certification === 'true')

  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingAnnouncement, setUploadingAnnouncement] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const announcementFileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      await Promise.all([
        updateSystemSetting('app_name', appName),
        updateSystemSetting('logo_url', logoUrl),
        updateSystemSetting('primary_color', primaryColor),
        updateSystemSetting('accent_color', accentColor),
        updateSystemSetting('login_announcement', announcement),
        updateSystemSetting('announcement_type', announcementType),
        updateSystemSetting('announcement_format', announcementFormat),
        updateSystemSetting('announcement_image_url', announcementImageUrl),
        updateSystemSetting('announcement_show_at', announcementShowAt),
        updateSystemSetting('announcement_active', announcementActive.toString()),
        updateSystemSetting('enable_work_certification', enableWorkCertification.toString()),
      ])
      showToast('บันทึกการตั้งค่าสำเร็จ — Refresh หน้าเพื่อดูการเปลี่ยนแปลง', 'success')
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
    } finally {
      setSaving(false)
    }
  }

  const announcementStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ️' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '⚠️' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✅' },
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h2>
          <p className="text-sm text-gray-500 mt-1">ปรับแต่ง Branding และประกาศสำหรับทั้งระบบ</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Branding ── */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Type className="w-4 h-4 text-blue-600" /> ข้อมูลระบบ
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อระบบ</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="เช่น Easy OT"
              />
              <p className="text-xs text-gray-400 mt-1">แสดงใน Sidebar, Header, และหน้า Login</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" /> โลโก้ระบบ (Logo)
              </label>
              
              <div className="flex items-center gap-4 mt-2">
                {logoUrl && (
                  <div className="flex-shrink-0 w-16 h-16 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center relative group">
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setUploadingLogo(true)
                      try {
                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch('/api/upload-logo', {
                          method: 'POST',
                          body: formData
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error)
                        setLogoUrl(data.url)
                        showToast('อัปโหลดโลโก้สำเร็จ', 'success')
                      } catch (err: any) {
                        showToast('อัปโหลดล้มเหลว: ' + err.message, 'error')
                      } finally {
                        setUploadingLogo(false)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 mr-2 text-gray-500" />
                    {uploadingLogo ? 'กำลังอัปโหลด...' : 'อัปโหลดโลโก้ใหม่'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    (อัปโหลดได้ 1 ไฟล์ ระบบจะนำไปทับโลโก้เดิม)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Colors ── */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-600" /> ธีมสี
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">สีหลัก (Primary)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                />
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setPrimaryColor(c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">สีรอง (Accent)</label>
              <div className="flex items-center gap-3">
                <input type="color" className="w-10 h-10 rounded-lg border cursor-pointer" value={accentColor} onChange={e => setAccentColor(e.target.value)} />
                <input type="text" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" value={accentColor} onChange={e => setAccentColor(e.target.value)} />
              </div>
            </div>
            {/* Preview bar */}
            <div className="rounded-lg overflow-hidden border">
              <div className="h-3" style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }} />
              <div className="p-3 bg-gray-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: primaryColor }}>OT</div>
                <span className="text-sm font-medium text-gray-700">ตัวอย่างสี</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Announcement ── */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" /> ระบบประกาศ
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={announcementActive} onChange={e => setAnnouncementActive(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">{announcementActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
            </label>
          </div>
          <div className={`p-6 space-y-6 ${!announcementActive ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">แสดงประกาศที่ไหน (Show At)</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="showAt" value="before_login" checked={announcementShowAt === 'before_login'} onChange={e => setAnnouncementShowAt(e.target.value)} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                    <span className="text-sm text-gray-700">ก่อนเข้าสู่ระบบ (หน้า Login)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="showAt" value="after_login" checked={announcementShowAt === 'after_login'} onChange={e => setAnnouncementShowAt(e.target.value)} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                    <span className="text-sm text-gray-700">หลังเข้าสู่ระบบ (ในระบบ)</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบประกาศ (Format)</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="format" value="text" checked={announcementFormat === 'text'} onChange={e => setAnnouncementFormat(e.target.value)} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                    <span className="text-sm text-gray-700">ข้อความ / แถบสี (Text)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="format" value="image" checked={announcementFormat === 'image'} onChange={e => setAnnouncementFormat(e.target.value)} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                    <span className="text-sm text-gray-700">รูปภาพ Pop-up (Image)</span>
                  </label>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {announcementFormat === 'text' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ข้อความประกาศ</label>
                  <textarea
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                    rows={3}
                    value={announcement}
                    onChange={e => setAnnouncement(e.target.value)}
                    placeholder="เช่น ระบบจะปิดปรับปรุงวันที่ 1-2 ก.ค. 2568"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ประเภทแถบสี</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    value={announcementType}
                    onChange={e => setAnnouncementType(e.target.value)}
                  >
                    <option value="info">ℹ️ ข้อมูล (สีน้ำเงิน)</option>
                    <option value="warning">⚠️ คำเตือน (สีส้ม)</option>
                    <option value="success">✅ สำเร็จ (สีเขียว)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">รูปภาพ Pop-up ประกาศ</label>
                <div className="flex items-start gap-4 mt-2">
                  {announcementImageUrl && (
                    <div className="flex-shrink-0 w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center relative group">
                      <img src={announcementImageUrl} alt="Announcement" className="max-w-full max-h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={announcementFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        setUploadingAnnouncement(true)
                        try {
                          const formData = new FormData()
                          formData.append('file', file)
                          const res = await fetch('/api/upload-announcement', {
                            method: 'POST',
                            body: formData
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error)
                          setAnnouncementImageUrl(data.url)
                          showToast('อัปโหลดรูปประกาศสำเร็จ', 'success')
                        } catch (err: any) {
                          showToast('อัปโหลดล้มเหลว: ' + err.message, 'error')
                        } finally {
                          setUploadingAnnouncement(false)
                          if (announcementFileInputRef.current) announcementFileInputRef.current.value = ''
                        }
                      }}
                    />
                    <button
                      onClick={() => announcementFileInputRef.current?.click()}
                      disabled={uploadingAnnouncement}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 mr-2 text-gray-500" />
                      {uploadingAnnouncement ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพใหม่'}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">
                      รองรับไฟล์ JPG, PNG (รูปภาพจะแสดงเป็น Pop-up ปรับตามขนาดหน้าจอ)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Text */}
            {announcementFormat === 'text' && announcement && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><Eye className="w-3 h-3" /> ตัวอย่าง:</p>
                <div className={`p-3 rounded-lg border ${announcementStyles[announcementType]?.bg} ${announcementStyles[announcementType]?.border}`}>
                  <p className={`text-sm ${announcementStyles[announcementType]?.text}`}>
                    {announcementStyles[announcementType]?.icon} {announcement}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Advanced Features ── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" /> ฟีเจอร์เพิ่มเติม
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">ระบบรับรองการปฏิบัติงาน (Work Certification)</h4>
              <p className="text-sm text-gray-500 mt-1">
                เมื่อเปิดใช้งาน เจ้าหน้าที่จะต้องได้รับการรับรองเวลาปฏิบัติงานจริงจากผู้อำนวยการกลุ่มและผู้อำนวยการกอง หลังจากเวลาสิ้นสุดการทำ OT
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={enableWorkCertification} onChange={e => setEnableWorkCertification(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">{enableWorkCertification ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
