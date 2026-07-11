'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { loginWithLine, loginWithPassword, registerWithLine, linkLineToExistingAccount } from '@/app/actions/auth'
import { fetchDivisions, fetchGroups } from '@/app/actions/admin'

type Props = {
  appName: string
  logoUrl: string
  primaryColor: string
  announcement: string
  announcementType: string
  announcementFormat: string
  announcementImageUrl: string
  announcementShowAt: string
  announcementActive: boolean
}

export default function LoginClient({ 
  appName, logoUrl, primaryColor, 
  announcement, announcementType,
  announcementFormat, announcementImageUrl, announcementShowAt, announcementActive
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsRegistration, setNeedsRegistration] = useState(false)
  const [lineUid, setLineUid] = useState('')
  const [registrationMode, setRegistrationMode] = useState<'link' | 'register'>('link')
  
  // UI State
  const [loginMethod, setLoginMethod] = useState<'main' | 'password'>('main')
  const [showImagePopup, setShowImagePopup] = useState(true)
  
  // Password Form State
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Registration Form State
  const [divisions, setDivisions] = useState<{ id: string, name: string }[]>([])
  const [groups, setGroups] = useState<{ id: string, name: string, division_id: string }[]>([])
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    division_id: '',
    group_id: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Initialize from Callback URL if needed
  useEffect(() => {
    const isRegister = searchParams.get('register')
    const uid = searchParams.get('lineUid')
    const err = searchParams.get('error')

    if (err) {
      setError(`Login Error: ${err}`)
    }

    if (isRegister && uid) {
      setLineUid(uid)
      setNeedsRegistration(true)
      fetchDivisions().then(divs => setDivisions(divs))
      fetchGroups().then(grps => setGroups(grps))
    }
  }, [searchParams])

  const handleLiffLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      
      // Dev Bypass
      if (!liffId || liffId.startsWith('123') || liffId.includes('mock')) {
        console.log('Running in Dev Mode (No valid LIFF ID)')
        setLineUid('dev-mock-uid-123')
        const result = await loginWithLine('dev-mock-uid-123')
        
        if (result.registered) {
          sessionStorage.removeItem('has_seen_announcement')
          router.push(result.redirectTo ?? '/employee')
        } else {
          const divs = await fetchDivisions()
          setDivisions(divs)
          const grps = await fetchGroups()
          setGroups(grps)
          setNeedsRegistration(true)
        }
        setLoading(false)
        return
      }
      
      await liff.init({ liffId })
      
      if (!liff.isLoggedIn()) {
        liff.login()
        return
      }

      const profile = await liff.getProfile()
      setLineUid(profile.userId)

      const result = await loginWithLine(profile.userId)
      
      if (result.registered) {
        sessionStorage.removeItem('has_seen_announcement')
        router.push(result.redirectTo ?? '/employee')
      } else {
        const divs = await fetchDivisions()
        setDivisions(divs)
        const grps = await fetchGroups()
        setGroups(grps)
        setNeedsRegistration(true)
      }
    } catch (err: any) {
      console.error('LIFF Init Error:', err)
      setError(err.message || 'Failed to initialize LIFF')
    }
    setLoading(false)
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await loginWithPassword(username, password)
      if (result.success) {
        sessionStorage.removeItem('has_seen_announcement')
        router.push(result.redirectTo ?? '/employee')
      }
    } catch (err: any) {
      setError(err.message || 'รหัสผ่านไม่ถูกต้อง')
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await registerWithLine({
        line_uid: lineUid,
        ...formData
      })
      router.push('/employee')
    } catch (err: any) {
      setError(err.message || 'Failed to register')
      setSubmitting(false)
    }
  }

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await linkLineToExistingAccount({
        username,
        password_text: password,
        lineUid
      })
      if (result.success) {
        sessionStorage.removeItem('has_seen_announcement')
        router.push(result.redirectTo ?? '/employee')
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อบัญชีได้')
      setSubmitting(false)
    }
  }

  const announcementStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ️' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: '⚠️' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '✅' },
  }

  if (loading && !needsRegistration) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${primaryColor} transparent ${primaryColor} ${primaryColor}` }}></div>
        <p className="mt-4 text-gray-500">กำลังเข้าสู่ระบบ...</p>
      </div>
    )
  }

  // --- Registration View ---
  if (needsRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
              <span className="text-2xl">🔗</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">เข้าใช้งานครั้งแรก</h1>
            <p className="text-sm text-gray-500 mt-2">กรุณาเลือกวิธีการเชื่อมต่อบัญชีกับ LINE ของคุณ</p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-gray-100 mb-6 bg-gray-50 p-1 rounded-xl">
            <button
              onClick={() => { setRegistrationMode('link'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                registrationMode === 'link'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              มีบัญชีเดิมอยู่แล้ว
            </button>
            <button
              onClick={() => { setRegistrationMode('register'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                registrationMode === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              ผู้ใช้งานใหม่
            </button>
          </div>
          
          {registrationMode === 'link' ? (
            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs leading-relaxed mb-2">
                💡 หากผู้ดูแลระบบได้สร้างชื่อผู้ใช้งานไว้ให้แล้ว กรุณากรอก Username และ Password เพื่อเชื่อมต่อบัญชีเก่าของคุณเข้ากับ LINE
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="เช่น somchai_j"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  required
                  type="password" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="รหัสผ่านของคุณ"
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-3 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm mt-2"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อบัญชี'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                  value={formData.position}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                  placeholder="เช่น เจ้าพนักงานธุรการ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">แผนก / กอง</label>
                <select 
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                  value={formData.division_id}
                  onChange={e => setFormData({...formData, division_id: e.target.value, group_id: ''})}
                >
                  <option value="">-- เลือกแผนก --</option>
                  {divisions.map(div => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่ม (ถ้ามี)</label>
                <select 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                  value={formData.group_id}
                  onChange={e => setFormData({...formData, group_id: e.target.value})}
                >
                  <option value="">-- ไม่ระบุ / ทั้งกอง --</option>
                  {groups.filter(g => g.division_id === formData.division_id).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-3 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? 'กำลังบันทึก...' : 'ลงทะเบียนและเข้าใช้งาน'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // --- Main Login View ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="w-16 h-16 rounded-2xl mx-auto mb-4 object-contain shadow-sm" />
          ) : (
            <div className="w-24 h-24 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm" style={{ backgroundColor: `${primaryColor}18` }}>
              <span className="text-5xl">⏱️</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="text-sm text-gray-500 mt-2">ระบบจัดการการขออนุมัติล่วงเวลา</p>
        </div>

        {/* Announcement Text */}
        {announcementActive && announcementShowAt === 'before_login' && announcementFormat === 'text' && announcement && (
          <div className={`mb-6 p-3.5 rounded-lg border ${announcementStyles[announcementType]?.bg} ${announcementStyles[announcementType]?.border}`}>
            <p className={`text-sm leading-relaxed ${announcementStyles[announcementType]?.text}`}>
              {announcementStyles[announcementType]?.icon} {announcement}
            </p>
          </div>
        )}

        {/* Announcement Image Modal */}
        {announcementActive && announcementShowAt === 'before_login' && announcementFormat === 'image' && announcementImageUrl && showImagePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowImagePopup(false)}>
            <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setShowImagePopup(false)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
              >
                ✕
              </button>
              <img src={announcementImageUrl} alt="Announcement" className="w-full h-auto max-h-[80vh] object-contain" />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {loginMethod === 'main' ? (
          <div className="space-y-3">
            <button 
              onClick={handleLiffLogin}
              className="w-full py-3 px-4 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M22.5 10.4c0-4.3-4.4-7.8-9.8-7.8S2.9 6.1 2.9 10.4c0 3.9 3.5 7.2 8.1 7.7.3.1.8.2.9.5.1.2.1.6 0 .9l-.3 1.9c0 .1-.1.4.3.6.4.2.9-.1 1.2-.3 1.2-.8 6.4-3.8 8-5.8 1-1.3 1.4-2.8 1.4-4.5z"/></svg>
              เข้าสู่ระบบด้วย LINE (LIFF)
            </button>

            <button 
              onClick={() => router.push('/api/auth/line/login')}
              className="w-full py-3 px-4 bg-white border-2 border-[#06C755] text-[#06C755] hover:bg-green-50 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M22.5 10.4c0-4.3-4.4-7.8-9.8-7.8S2.9 6.1 2.9 10.4c0 3.9 3.5 7.2 8.1 7.7.3.1.8.2.9.5.1.2.1.6 0 .9l-.3 1.9c0 .1-.1.4.3.6.4.2.9-.1 1.2-.3 1.2-.8 6.4-3.8 8-5.8 1-1.3 1.4-2.8 1.4-4.5z"/></svg>
              เข้าสู่ระบบด้วย LINE (QR Code)
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-500">หรือ</span></div>
            </div>

            <button 
              onClick={() => setLoginMethod('password')}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium rounded-xl transition-all flex items-center justify-center active:scale-[0.98]"
            >
              🔑 เข้าสู่ระบบด้วยรหัสผ่าน
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้งาน"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3 text-white rounded-xl font-medium hover:opacity-90 transition-all mt-2 shadow-sm active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              เข้าสู่ระบบ
            </button>

            <button 
              type="button"
              onClick={() => { setLoginMethod('main'); setError('') }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← กลับไปหน้าหลัก
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          {appName} v2.0 — ระบบจัดการ OT
        </p>
      </div>
    </div>
  )
}
