'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import liff from '@line/liff'
import { loginWithLine, loginWithPassword, registerWithLine, linkLineToExistingAccount } from '@/app/actions/auth'
import { fetchDivisions, fetchGroups } from '@/app/actions/admin'
import { recordConsent } from '@/app/actions/consent'
import { Clock, Shield, Sparkles, User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Smartphone, KeyRound, Building2, FileText, X } from 'lucide-react'

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
  const [loginMethod, setLoginMethod] = useState<'line' | 'password'>('line')
  const [showImagePopup, setShowImagePopup] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  
  // PDPA Privacy Notice State
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false)
  const [pendingLoginAction, setPendingLoginAction] = useState<(() => void) | null>(null)
  
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
  const [consentGiven, setConsentGiven] = useState(false)
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
      fetchDivisions().then(divs => setDivisions(divs)).catch(() => {})
      fetchGroups().then(grps => setGroups(grps)).catch(() => {})
    }
  }, [searchParams])

  // เปิด Privacy Notice ก่อน LIFF login
  const handleLiffLoginClick = () => {
    setPendingLoginAction(() => handleLiffLogin)
    setShowPrivacyNotice(true)
  }

  const handleLiffLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      
      // Dev Bypass
      if (!liffId || liffId.startsWith('123') || liffId.includes('mock') || process.env.NODE_ENV === 'development') {
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
      setError(err.message || 'ไม่สามารถเชื่อมต่อ LINE LIFF ได้ในขณะนี้')
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
      setError(err.message || 'รหัสผ่านหรือชื่อผู้ใช้ไม่ถูกต้อง')
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consentGiven) {
      setError('กรุณายอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคลก่อนลงทะเบียน')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { user } = await registerWithLine({
        line_uid: lineUid,
        ...formData
      }) as any
      // บันทึก consent หลังลงทะเบียนสำเร็จ
      try {
        const { getSessionUser } = await import('@/app/actions/auth')
        const sessionUser = await getSessionUser()
        if (sessionUser?.id) {
          await recordConsent({ userId: sessionUser.id, consentType: 'privacy_policy', consentGiven: true, method: 'checkbox' })
          await recordConsent({ userId: sessionUser.id, consentType: 'line_uid_processing', consentGiven: true, method: 'checkbox' })
        }
      } catch {}
      router.push('/employee')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน')
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
    info: { bg: 'bg-blue-50/90', border: 'border-blue-200', text: 'text-blue-800', icon: 'ℹ️' },
    warning: { bg: 'bg-amber-50/90', border: 'border-amber-200', text: 'text-amber-800', icon: '⚠️' },
    success: { bg: 'bg-emerald-50/90', border: 'border-emerald-200', text: 'text-emerald-800', icon: '✅' },
  }

  // ─── Privacy Notice Modal ──────────────────────────────────────────────────
  const PrivacyNoticeModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-white" />
          <h2 className="text-sm font-bold text-white">แจ้งให้ทราบเกี่ยวกับข้อมูลส่วนบุคคล</h2>
          <button onClick={() => setShowPrivacyNotice(false)} className="ml-auto text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            ระบบ <strong>Easy OT</strong> เก็บรวบรวมข้อมูลส่วนบุคคลของท่านเพื่อใช้ในการบริหารจัดการ การทำงานล่วงเวลา (OT) ของหน่วยงาน ตาม <strong>พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</strong>
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">ข้อมูลที่เก็บรวบรวม:</p>
            {[
              'ชื่อ-นามสกุล, ตำแหน่ง, กอง/สำนัก',
              'LINE UID เพื่อการแจ้งเตือนผ่าน LINE',
              'ข้อมูลการทำงานล่วงเวลา (วัน/เวลา/เหตุผล)',
              'ลายมือชื่ออิเล็กทรอนิกส์ (หากมีการอัปโหลด)',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            ข้อมูลของท่านจะถูกใช้เพื่อวัตถุประสงค์ดังกล่าวเท่านั้น และได้รับการปกป้องตามมาตรการความปลอดภัยที่เหมาะสม
          </p>
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <FileText className="w-3.5 h-3.5" />
            อ่านนโยบายคุ้มครองข้อมูลส่วนบุคคลฉบับเต็ม
          </Link>
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button
            onClick={() => setShowPrivacyNotice(false)}
            className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => {
              setShowPrivacyNotice(false)
              if (pendingLoginAction) pendingLoginAction()
            }}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            รับทราบและดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>
  )

  if (loading && !needsRegistration) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 p-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
            <Clock className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-3xl blur-xl opacity-30 animate-ping"></div>
        </div>
        <p className="mt-6 text-sm font-medium text-slate-600 tracking-wide">กำลังเข้าสู่ระบบ Easy OT...</p>
      </div>
    )
  }

  // --- Registration View ---
  if (needsRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="glass-card max-w-lg w-full p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 border border-slate-200/80">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">เข้าใช้งานครั้งแรก</h1>
            <p className="text-sm text-slate-500 mt-1.5">เลือกวิธีการเชื่อมต่อบัญชีกับ LINE ของคุณเพื่อเริ่มใช้งาน</p>
          </div>

          {/* Tab Selection */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setRegistrationMode('link'); setError(''); }}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                registrationMode === 'link'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มีบัญชีในระบบอยู่แล้ว
            </button>
            <button
              type="button"
              onClick={() => { setRegistrationMode('register'); setError(''); }}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                registrationMode === 'register'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ผู้ใช้งานใหม่
            </button>
          </div>
          
          {registrationMode === 'link' ? (
            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-blue-800 text-xs leading-relaxed flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <span>หากเจ้าหน้าที่ดูแลระบบได้สร้างชื่อผู้ใช้งานไว้แล้ว กรุณากรอก Username & Password เพื่อผูกบัญชีเข้ากับ LINE</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ชื่อผู้ใช้งาน (Username)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input 
                    required
                    type="text" 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="เช่น somchai_j"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input 
                    required
                    type="password" 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="รหัสผ่านของคุณ"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-3 text-white rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] mt-2 flex items-center justify-center gap-2"
              >
                {submitting ? 'กำลังเชื่อมต่อ...' : 'ยืนยันและเชื่อมต่อบัญชี'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ชื่อ-นามสกุล</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ตำแหน่ง</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                  value={formData.position}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                  placeholder="เช่น นักวิเคราะห์นโยบายและแผนปฏิบัติการ"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">กอง / สำนัก</label>
                <select 
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                  value={formData.division_id}
                  onChange={e => setFormData({...formData, division_id: e.target.value, group_id: ''})}
                >
                  <option value="">-- เลือกกอง / สำนัก --</option>
                  {divisions.map(div => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">กลุ่ม / ฝ่าย</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                  value={formData.group_id}
                  onChange={e => setFormData({...formData, group_id: e.target.value})}
                >
                  <option value="">-- ไม่ระบุ / ขึ้นตรงต่อกอง --</option>
                  {groups.filter(g => g.division_id === formData.division_id).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* PDPA Consent Checkbox */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <input
                    id="consent-checkbox"
                    type="checkbox"
                    required
                    checked={consentGiven}
                    onChange={e => setConsentGiven(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                  />
                  <label htmlFor="consent-checkbox" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                    ข้าพเจ้ายินยอมให้ระบบ Easy OT เก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคล ได้แก่ ชื่อ-นามสกุล, ตำแหน่ง, LINE UID, ข้อมูล OT และลายมือชื่ออิเล็กทรอนิกส์ เพื่อวัตถุประสงค์ในการบริหารจัดการการทำงานล่วงเวลา ตาม{' '}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-800 font-medium">
                      นโยบายคุ้มครองข้อมูลส่วนบุคคล
                    </Link>
                    {' '}(PDPA)
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 pl-6.5">
                  ท่านสามารถถอนความยินยอมได้ทุกเมื่อผ่านหน้าโปรไฟล์
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={submitting || !consentGiven}
                className="w-full py-3 text-white rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] mt-2 flex items-center justify-center gap-2"
              >
                {submitting ? 'กำลังบันทึก...' : 'ลงทะเบียนและเข้าใช้งาน'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // --- Main Login View ---
  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/20 p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 right-1/3 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-card max-w-md w-full p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 border border-slate-200/80">
        
        {/* Header & Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-16 h-16 rounded-2xl object-contain shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25 relative group">
                <Clock className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">{appName}</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
              v2.4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">ระบบบริหารและขออนุมัติการทำงานล่วงเวลา</p>
        </div>

        {/* Announcement Text */}
        {announcementActive && announcementShowAt === 'before_login' && announcementFormat === 'text' && announcement && (
          <div className={`mb-5 p-3.5 rounded-2xl border ${announcementStyles[announcementType]?.bg} ${announcementStyles[announcementType]?.border}`}>
            <p className={`text-xs leading-relaxed ${announcementStyles[announcementType]?.text}`}>
              {announcementStyles[announcementType]?.icon} {announcement}
            </p>
          </div>
        )}

        {/* Announcement Image Modal */}
        {announcementActive && announcementShowAt === 'before_login' && announcementFormat === 'image' && announcementImageUrl && showImagePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowImagePopup(false)}>
            <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
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
          <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/80 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => { setLoginMethod('line'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              loginMethod === 'line'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            เข้าสู่ระบบ LINE
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod('password'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              loginMethod === 'password'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            รหัสผ่าน / ผู้ดูแล
          </button>
        </div>

        {loginMethod === 'line' ? (
          <div className="space-y-3">
            <button 
              onClick={handleLiffLoginClick}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#06C755] to-[#05b34c] hover:from-[#05b34c] hover:to-[#049a41] text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-md shadow-emerald-500/20 active:scale-[0.98] text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
                <path d="M22.5 10.4c0-4.3-4.4-7.8-9.8-7.8S2.9 6.1 2.9 10.4c0 3.9 3.5 7.2 8.1 7.7.3.1.8.2.9.5.1.2.1.6 0 .9l-.3 1.9c0 .1-.1.4.3.6.4.2.9-.1 1.2-.3 1.2-.8 6.4-3.8 8-5.8 1-1.3 1.4-2.8 1.4-4.5z"/>
              </svg>
              <span>เข้าสู่ระบบด้วย LINE (LIFF)</span>
            </button>

            <button 
              onClick={() => router.push('/api/auth/line/login')}
              className="w-full py-3 px-4 bg-white border border-[#06C755]/30 hover:border-[#06C755] text-emerald-700 hover:bg-emerald-50/50 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0 text-[#06C755]">
                <path d="M22.5 10.4c0-4.3-4.4-7.8-9.8-7.8S2.9 6.1 2.9 10.4c0 3.9 3.5 7.2 8.1 7.7.3.1.8.2.9.5.1.2.1.6 0 .9l-.3 1.9c0 .1-.1.4.3.6.4.2.9-.1 1.2-.3 1.2-.8 6.4-3.8 8-5.8 1-1.3 1.4-2.8 1.4-4.5z"/>
              </svg>
              <span>เข้าสู่ระบบด้วย LINE (QR Code)</span>
            </button>

            <div className="pt-2 space-y-2">
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-500 text-center leading-relaxed">
                เข้าสู่ระบบครั้งแรกผ่าน LINE ระบบจะสร้างบัญชีผู้ใช้งานให้ท่านโดยอัตโนมัติ
              </div>
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors py-1"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span className="underline underline-offset-2">นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input 
                  type="text" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ชื่อผู้ใช้งานของคุณ"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none text-slate-900 text-sm transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-3 text-white rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] text-sm mt-1"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-5">
          {appName} v2.4 — ระบบขออนุมัติและรับรองการทำงานล่วงเวลา
        </p>
      </div>
    </div>
    {showPrivacyNotice && <PrivacyNoticeModal />}
    </>
  )
}
