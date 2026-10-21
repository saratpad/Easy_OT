'use client'

import { OverviewData, sendFiscalYearCutoffLineNotification } from '@/app/actions/overview'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend, 
  BarChart, 
  Bar 
} from 'recharts'
import { 
  BarChart3, 
  Clock, 
  FileText, 
  Sparkles, 
  Users, 
  User, 
  CheckCircle2, 
  Zap, 
  Building2, 
  Check, 
  TrendingUp, 
  CalendarDays,
  PieChart as PieChartIcon,
  Send,
  ShieldCheck,
  AlertCircle,
  Coins,
  Banknote,
  Briefcase,
  CalendarCheck,
  AlertTriangle,
  Info
} from 'lucide-react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function OverviewClient({ 
  overviewData, 
  role, 
  divisions = [], 
  groups = [], 
  selectedDivisionId = '', 
  selectedGroupId = '',
  scopeName = '',
  userDivisionId = ''
}: { 
  overviewData: OverviewData | null, 
  role: string,
  divisions?: any[],
  groups?: any[],
  selectedDivisionId?: string,
  selectedGroupId?: string,
  scopeName?: string,
  userDivisionId?: string
}) {
  const [copied, setCopied] = useState(false)
  const [sendingLine, setSendingLine] = useState(false)
  const [lineToast, setLineToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [chartView, setChartView] = useState<'hours' | 'compensation'>('hours')

  const router = useRouter()
  const searchParams = useSearchParams()

  if (!overviewData) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl max-w-lg mx-auto my-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-gray-800">ไม่สามารถโหลดข้อมูลสถิติได้</h3>
        <p className="text-xs text-gray-500 mt-1">กรุณาลองใหม่อีกครั้งหรือตรวจสอบการเชื่อมต่อ</p>
      </div>
    )
  }

  const { deepInsights, fiscalYear, compensation } = overviewData

  // Format month for display
  const formattedChartData = overviewData.chartData.map(d => ({
    ...d,
    monthLabel: d.monthLabel || d.month,
    workdayCompensation: d.workdayCompensation || 0,
    holidayCompensation: d.holidayCompensation || 0,
    totalCompensation: (d.workdayCompensation || 0) + (d.holidayCompensation || 0),
  }))

  const handleFilterChange = (type: 'division' | 'group' | 'fiscal_year', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type === 'division') {
      if (value) params.set('division_id', value)
      else params.delete('division_id')
      params.delete('group_id')
    } else if (type === 'group') {
      if (value) params.set('group_id', value)
      else params.delete('group_id')
    } else if (type === 'fiscal_year') {
      if (value) params.set('fiscal_year', value)
      else params.delete('fiscal_year')
    }
    
    router.push(`/overview?${params.toString()}`)
  }

  const handleSendLineNotification = async () => {
    const targetDivId = selectedDivisionId || userDivisionId
    if (!targetDivId) {
      setLineToast({ 
        message: 'กรุณาเลือกกอง/สำนักที่ต้องการส่งแจ้งเตือน หรือล็อกอินด้วยบัญชีสังกัดกอง', 
        type: 'error' 
      })
      setTimeout(() => setLineToast(null), 4000)
      return
    }

    const fyLabel = fiscalYear.label
    const totalCompStr = compensation.totalAmount.toLocaleString()
    const confirmSend = window.confirm(`ยืนยันการส่งข้อความแจ้งสรุปตัดยอด ${fyLabel}\nยอดค่าตอบแทนรวม ฿${totalCompStr} บาท เข้า LINE กลุ่มของหน่วยงานหรือไม่?`)
    if (!confirmSend) return

    setSendingLine(true)
    try {
      const res = await sendFiscalYearCutoffLineNotification({
        divisionId: targetDivId,
        fiscalYear: fiscalYear.selectedCE
      })
      setLineToast({ message: res.message, type: 'success' })
    } catch (err: any) {
      setLineToast({ message: err.message || 'ส่งแจ้งเตือนไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า LINE ของกอง', type: 'error' })
    } finally {
      setSendingLine(false)
      setTimeout(() => setLineToast(null), 5000)
    }
  }

  const handleAskAI = async () => {
    const dataStr = overviewData.chartData.map(d => `${d.fullLabel || d.month}: ขอ ${d.requestedHours} ชม. / ทำจริง ${d.actualHours} ชม. (ค่าตอบแทน ฿${(d.compensation || 0).toLocaleString()} บ.)`).join(', ')
    const topUsersStr = deepInsights.topUsers.map(u => `- ${u.name}: ${u.hours} ชม. (ค่าตอบแทน ฿${(u.compensation || 0).toLocaleString()} บ.)`).join('\n')
    const topGroupsStr = deepInsights.topGroups.map(g => `- ${g.name}: ${g.hours} ชม. (ค่าตอบแทน ฿${(g.compensation || 0).toLocaleString()} บ.)`).join('\n')
    const topReasonsStr = deepInsights.topReasons.map(r => `- ${r.reason} (${r.count} ครั้ง)`).join('\n')
    const positionDistStr = deepInsights.positionDistribution.map(p => `- ${p.position}: ${p.hours} ชม.`).join('\n')
    const timeDistStr = deepInsights.timeOfDayDistribution.map(t => `- ${t.time}: ${t.hours} ชม.`).join('\n')

    const prompt = `ในฐานะที่ฉันเป็นผู้บริหาร นี่คือข้อมูลเชิงลึก (Deep Insights) และงบประมาณค่าตอบแทนการทำงานล่วงเวลา (OT) ในขอบเขตข้อมูล "${scopeName}" ประจำ${fiscalYear.label} (${fiscalYear.rangeLabel}):

1. สรุปภาพรวมรอบปีงบประมาณและงบประมาณค่าตอบแทน:
- คำร้องทั้งหมด: ${overviewData.totalRequests} รายการ
- อนุมัติไปแล้วรวม: ${overviewData.totalApprovedHours} ชั่วโมง (เฉลี่ย ${deepInsights.averageDuration} ชั่วโมง/คำร้อง)
- ยอดงบประมาณค่าตอบแทนรวม: ฿${compensation.totalAmount.toLocaleString()} บาท
  • วันทำการ (อัตรา 50 บ./ชม. ไม่เกิน 4 ชม./วัน): ฿${compensation.workdayAmount.toLocaleString()} บาท (${compensation.workdayPayableHours} ชม.)
  • วันหยุดราชการ/สุดสัปดาห์ (อัตรา 60 บ./ชม. ไม่เกิน 7 ชม./วัน): ฿${compensation.holidayAmount.toLocaleString()} บาท (${compensation.holidayPayableHours} ชม.)
  • ชั่วโมงเกินเพดานระเบียบ: ${compensation.cappedExcessHours} ชม.
- รายละเอียดรายเดือน: ${dataStr}

2. ใคร/ตำแหน่งใด ที่ทำ OT และได้รับค่าตอบแทนสูงสุด (Top Requesters & Positions):
${topUsersStr}
การกระจายตามระดับตำแหน่ง:
${positionDistStr}

3. ทำอะไร (Top Reasons for OT):
${topReasonsStr}

4. กลุ่มไหนทำ OT และใช้งบประมาณสูงสุด (Top Groups):
${topGroupsStr || '- ไม่มีข้อมูลระดับกลุ่ม หรือเป็นข้อมูลส่วนบุคคล'}

5. ทำเวลาไหนบ่อยที่สุด (Time Distribution):
${timeDistStr}

โปรดวิเคราะห์ข้อมูลเชิงลึกและงบประมาณนี้ว่า:
1. การใช้งบประมาณค่าตอบแทนและการกระจายตัวของภาระงานมีความคุ้มค่า เหมาะสมตามระเบียบราชการหรือไม่?
2. มีภาระงานหรือค่าตอบแทนกระจุกตัวที่บุคคลหรือกลุ่มงานใดเป็นพิเศษหรือไม่?
3. โปรดให้ข้อเสนอแนะเชิงบริหารในการบริหารจัดการงบประมาณค่าตอบแทน OT การจัดสรรกำลังคน และการปรับปรุงกระบวนการทำงานให้มีประสิทธิภาพสูงสุดตามรอบปีงบประมาณราชการ`

    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      
      const isLine = typeof navigator !== 'undefined' && /Line/i.test(navigator.userAgent)
      if (isLine) {
        alert('✅ ระบบได้ทำการวิเคราะห์ข้อมูลเชิงลึกและงบประมาณ และคัดลอกข้อมูลสรุป (Prompt) เรียบร้อยแล้ว\n\nระบบจะเปิด Gemini ในเบราว์เซอร์หลักของเครื่อง เพื่อให้คุณสามารถกด "วาง" (Paste) ข้อมูลได้สะดวกครับ')
        window.open('https://gemini.google.com/?openExternalBrowser=1', '_blank')
      } else {
        alert('✅ ระบบได้ทำการวิเคราะห์ข้อมูลเชิงลึกและงบประมาณ และคัดลอกข้อมูลสรุป (Prompt) ไว้ให้คุณแล้ว\n\nเมื่อหน้าต่าง Gemini เปิดขึ้นมา กรุณากด "วาง" (Paste / Ctrl+V) ในช่องข้อความเพื่อส่งข้อมูลให้ AI ได้เลยครับ')
        window.open('https://gemini.google.com/', '_blank')
      }
      setTimeout(() => setCopied(false), 4000)
    } catch (err) {
      console.error('Failed to copy', err)
      alert('ไม่สามารถคัดลอกข้อความได้ กรุณาลองอีกครั้ง')
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {lineToast && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
          lineToast.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-rose-600 text-white'
        }`}>
          {lineToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="flex-1">{lineToast.message}</span>
          <button 
            onClick={() => setLineToast(null)} 
            className="p-1 hover:bg-white/20 rounded-lg text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Header with Glassmorphism and Ambient Glow */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-950 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
                <span>รอบปีงบประมาณราชการ (๑ ต.ค. – ๓๐ ก.ย.)</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/30 text-[11px] font-medium text-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>จัดเก็บข้อมูล ๕ ปีตามกฎหมาย</span>
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              สถิติการปฏิบัติงานและงบประมาณ OT {fiscalYear.label}
            </h1>
            <p className="mt-1.5 text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              รอบระยะเวลา {fiscalYear.rangeLabel} — บริหารจัดการ ติดตามการตัดยอดสะสม และเบิกจ่ายค่าตอบแทนราชการ
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* LINE Cutoff Notification Button */}
            <button
              onClick={handleSendLineNotification}
              disabled={sendingLine}
              className="inline-flex items-center gap-2 px-4 py-3 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-50 text-white rounded-xl shadow-lg shadow-emerald-900/30 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{sendingLine ? 'กำลังส่ง LINE...' : '📢 แจ้งตัดยอดเข้า LINE กลุ่ม'}</span>
            </button>

            {/* AI Ask Button */}
            <button
              onClick={handleAskAI}
              className="group relative inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-white rounded-xl shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-xs cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4 animate-spin-slow" />}
              <span>{copied ? 'คัดลอก Prompt แล้ว!' : '✨ สรุปเชิงลึกด้วย AI'}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar inside Header */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/25 text-xs text-blue-200">
            <span className="font-semibold text-white">ขอบเขต:</span>
            <span>{scopeName}</span>
          </div>

          {/* Fiscal Year Selector */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 border border-white/20 text-xs font-medium text-white">
            <CalendarDays className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span className="font-semibold text-blue-100">ปีงบประมาณ:</span>
            <select
              value={fiscalYear.selectedCE.toString()}
              onChange={(e) => handleFilterChange('fiscal_year', e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {fiscalYear.availableYears.map((fy) => (
                <option key={fy.ce} value={fy.ce.toString()} className="text-gray-900">
                  {fy.label} {fy.isCurrent ? '(ปัจจุบัน)' : ''}
                </option>
              ))}
              <option value="all" className="text-gray-900">
                ทั้งหมด (5 ปีย้อนหลังตามระเบียบ ๕ ปี)
              </option>
            </select>
          </div>

          {(role === 'executive' || role === 'super_admin') && divisions.length > 0 && (
            <select
              value={selectedDivisionId}
              onChange={(e) => handleFilterChange('division', e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 text-white border border-white/20 focus:outline-none focus:bg-white focus:text-gray-900 transition-colors cursor-pointer"
            >
              <option value="" className="text-gray-800">-- ทุกกอง (ระดับองค์กร) --</option>
              {divisions.map((d: any) => (
                <option key={d.id} value={d.id} className="text-gray-800">{d.name}</option>
              ))}
            </select>
          )}

          {(role === 'executive' || role === 'super_admin' || role === 'director' || role === 'sub_admin') && groups.length > 0 && (
            <select
              value={selectedGroupId}
              onChange={(e) => handleFilterChange('group', e.target.value)}
              disabled={!selectedDivisionId && (role === 'executive' || role === 'super_admin')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 text-white border border-white/20 focus:outline-none focus:bg-white focus:text-gray-900 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <option value="" className="text-gray-800">-- ทุกกลุ่มงานในกอง --</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id} className="text-gray-800">{g.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ─── NEW: Executive Financial & Compensation Overview Deck ─── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                งบประมาณและมูลค่าตอบแทน OT (คิดจากชั่วโมงทำงานจริง)
              </h2>
              <p className="text-xs text-slate-500">
                คำนวณจากชั่วโมงที่ปฏิบัติงานจริงและรับรองผลแล้ว ตามระเบียบราชการ (วันทำการ ๕๐ บ./ชม. ไม่เกิน ๔ ชม. | วันหยุด ๖๐ บ./ชม. ไม่เกิน ๗ ชม.)
              </p>
            </div>
          </div>
          <span className="self-start sm:self-center inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            คิดจากชั่วโมงทำงานจริง (Actual Hours)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Compensation */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  ยอดค่าตอบแทนรวมทั้งสิ้น
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  คิดจากชั่วโมงทำงานจริง
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-emerald-700">฿</span>
              <span className="text-3xl font-extrabold text-emerald-950 tracking-tight font-display">
                {compensation.totalAmount.toLocaleString()}
              </span>
              <span className="text-xs text-emerald-700 font-semibold">บาท</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-700/80 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>ทำจริงเบิกจ่ายได้ {compensation.totalPayableHours} ชั่วโมง</span>
            </div>
          </div>

          {/* Card 2: Workday Compensation */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-slate-50 border border-blue-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  ค่าตอบแทนวันทำการ
                </span>
                <span className="text-[10px] text-blue-600 font-medium">
                  ๕๐ บ./ชม. (สูงสุด ๔ ชม./วัน)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-blue-700">฿</span>
              <span className="text-3xl font-extrabold text-blue-950 tracking-tight font-display">
                {compensation.workdayAmount.toLocaleString()}
              </span>
              <span className="text-xs text-blue-700 font-semibold">บาท</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-blue-700/80 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>{compensation.workdayPayableHours} ชม. เบิกจ่าย (จาก {compensation.workdayRawHours} ชม.)</span>
            </div>
          </div>

          {/* Card 3: Holiday Compensation */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-slate-50 border border-purple-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
                  ค่าตอบแทนวันหยุด
                </span>
                <span className="text-[10px] text-purple-600 font-medium">
                  ๖๐ บ./ชม. (สูงสุด ๗ ชม./วัน)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-purple-700">฿</span>
              <span className="text-3xl font-extrabold text-purple-950 tracking-tight font-display">
                {compensation.holidayAmount.toLocaleString()}
              </span>
              <span className="text-xs text-purple-700 font-semibold">บาท</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-purple-700/80 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>{compensation.holidayPayableHours} ชม. เบิกจ่าย (จาก {compensation.holidayRawHours} ชม.)</span>
            </div>
          </div>

          {/* Card 4: Regulation & Compliance */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all group ${
            compensation.cappedExcessHours > 0 
              ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-50 border-amber-200/90' 
              : 'bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-slate-50 border-teal-200/90'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-slate-700">
                  การปฏิบัติตามระเบียบ
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  เพดานระเบียบกระทรวงการคลัง
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${
                compensation.cappedExcessHours > 0 ? 'bg-amber-500 shadow-amber-500/25' : 'bg-teal-600 shadow-teal-500/25'
              }`}>
                {compensation.cappedExcessHours > 0 ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
            </div>
            <div className="mt-3">
              {compensation.cappedExcessHours > 0 ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-amber-950 tracking-tight font-display">
                      {compensation.cappedExcessHours}
                    </span>
                    <span className="text-xs text-amber-800 font-bold">ชม. เกินเพดาน</span>
                  </div>
                  <p className="mt-2 text-[11px] text-amber-700 leading-snug">
                    ตัดยอดตามเพดานกฎหมาย ไม่สามารถนำมาเบิกจ่ายได้
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-teal-950 tracking-tight font-display">
                      100%
                    </span>
                    <span className="text-xs text-teal-800 font-bold">ถูกต้องตามเพดาน</span>
                  </div>
                  <p className="mt-2 text-[11px] text-teal-700 leading-snug">
                    ทุกคำร้องอยู่ในเกณฑ์เพดานระเบียบราชการครบถ้วน
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Operational Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">คำร้องทั้งหมด</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight font-display">
              {overviewData.totalRequests}
            </span>
            <span className="text-xs text-gray-500 font-medium">รายการ</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">ยอดสะสมประจำ{fiscalYear.label}</p>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">ชั่วโมงปฏิบัติงานจริง</span>
              <span className="text-[10px] text-emerald-600 font-semibold">รับรองผลแล้ว</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight font-display">
              {overviewData.totalApprovedHours}
            </span>
            <span className="text-xs text-gray-500 font-medium">ชั่วโมง</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            ขออนุมัติรวม {overviewData.totalRequestedHours || 0} ชม.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">เฉลี่ยต่อคำร้อง</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-600 tracking-tight font-display">
              {deepInsights.averageDuration}
            </span>
            <span className="text-xs text-gray-500 font-medium">ชม./ครั้ง</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">ระยะเวลาปฏิบัติงานเฉลี่ย</p>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">สัดส่วนสถานะ</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <PieChartIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {overviewData.statusData.map((s, i) => (
              <span 
                key={i} 
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold"
                style={{ backgroundColor: `${s.color}15`, color: s.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name} {s.value}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">สถานะคำร้องในรอบปีงบประมาณ</p>
        </div>
      </div>

      {/* Main Charts Row with Dual Mode Toggle (Hours vs Compensation) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="glass-card p-6 rounded-3xl lg:col-span-2 shadow-sm border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                {chartView === 'hours' ? (
                  fiscalYear.selectedCE === 'all' 
                    ? 'แนวโน้มชั่วโมง OT ย้อนหลัง 5 ปีงบประมาณ' 
                    : `แนวโน้มชั่วโมง OT ประจำ${fiscalYear.label}`
                ) : (
                  fiscalYear.selectedCE === 'all' 
                    ? 'แนวโน้มค่าตอบแทน OT ย้อนหลัง 5 ปีงบประมาณ (บาท)' 
                    : `แนวโน้มค่าตอบแทน OT รายเดือนประจำ${fiscalYear.label} (บาท)`
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {chartView === 'hours'
                  ? (fiscalYear.selectedCE === 'all'
                      ? 'เปรียบเทียบชั่วโมงที่ขอปฏิบัติงาน vs ชั่วโมงที่ทำจริง รายปีงบประมาณ (5 ปีย้อนหลัง)'
                      : `แสดงข้อมูลรายเดือน 12 เดือน (ตุลาคม – กันยายน) ตามรอบปีงบประมาณราชการ (${fiscalYear.rangeLabel})`)
                  : (fiscalYear.selectedCE === 'all'
                      ? 'มูลค่าค่าตอบแทนที่เบิกจ่ายได้จริงแยกตามปีงบประมาณ (คำนวณตามเพดานระเบียบ)'
                      : `ค่าตอบแทนวันทำการ (๕๐ บ./ชม.) และวันหยุดราชการ/สุดสัปดาห์ (๖๐ บ./ชม.)`)}
              </p>
            </div>

            {/* View Mode Toggle Segmented Control */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartView('hours')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'hours'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>ชั่วโมง (ชม.)</span>
              </button>
              <button
                type="button"
                onClick={() => setChartView('compensation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartView === 'compensation'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>ค่าตอบแทน (฿)</span>
              </button>
            </div>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'hours' ? (
                <AreaChart data={formattedChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="monthLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                    formatter={(value: any, name: any) => [`${value || 0} ชั่วโมง`, name]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="requestedHours" 
                    name="ชั่วโมงที่ขออนุมัติ" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorRequested)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actualHours" 
                    name="ชั่วโมงที่ทำจริง" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorActual)" 
                  />
                </AreaChart>
              ) : (
                <BarChart data={formattedChartData} margin={{ top: 10, right: 20, left: -5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="monthLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(val) => `฿${(val || 0).toLocaleString()}`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                    formatter={(value: any, name: any) => [`฿${Number(value || 0).toLocaleString()} บาท`, name]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Bar 
                    dataKey="workdayCompensation" 
                    name="วันทำการ (๕๐ บ./ชม.)" 
                    fill="#3b82f6" 
                    stackId="a" 
                    radius={[0, 0, 0, 0]} 
                  />
                  <Bar 
                    dataKey="holidayCompensation" 
                    name="วันหยุด/สุดสัปดาห์ (๖๐ บ./ชม.)" 
                    fill="#8b5cf6" 
                    stackId="a" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Personnel with Hours & Compensation */}
        <div className="glass-card p-6 rounded-3xl flex flex-col justify-between shadow-sm border border-slate-200/80">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                บุคลากรที่ปฏิบัติงานสูงสุด (Top 5)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">ชั่วโมงและค่าตอบแทนสะสมประจำ{fiscalYear.label}</p>

            <div className="space-y-3">
              {deepInsights.topUsers.map((u, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/60 hover:bg-slate-100/90 transition-all flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                      i === 0 ? 'bg-amber-400 text-amber-950 font-extrabold' :
                      i === 1 ? 'bg-slate-300 text-slate-800' :
                      i === 2 ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-500">{u.hours} ชั่วโมง</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/70 text-xs font-extrabold text-emerald-700 font-display">
                      ฿{(u.compensation || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>คำนวณตามเพดานกฎหมาย</span>
            <span className="font-semibold text-emerald-700">ตัดยอด 30 ก.ย.</span>
          </div>
        </div>
      </div>

      {/* Deep Analytics Rows: Patterns, Reasons, and Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Day & Time Distribution */}
        <div className="glass-card p-6 rounded-3xl space-y-6 shadow-sm border border-slate-200/80">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-purple-600" />
              พฤติกรรมการปฏิบัติงาน
            </h3>
            <p className="text-xs text-gray-500 mb-4">การกระจายตัวตามวันและช่วงเวลา</p>

            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              กระจายตามวันทำงาน (จันทร์ - อาทิตย์)
            </h4>
            <div className="h-[140px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deepInsights.weekdayDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '11px' }} 
                    formatter={(val: any) => [`${val} ชม.`, 'ชั่วโมง']}
                  />
                  <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              ช่วงเวลาที่ปฏิบัติงานบ่อยที่สุด
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {deepInsights.timeOfDayDistribution.map((t, i) => (
                <div key={i} className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-xs font-semibold text-purple-950 truncate">{t.time}</span>
                  </div>
                  <span className="text-xs font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                    {t.hours} ชม.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Groups & Reasons Cards */}
        <div className="glass-card p-6 rounded-3xl lg:col-span-2 shadow-sm border border-slate-200/80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-emerald-600" />
                กลุ่มงานที่ทำ OT สูงสุด
              </h3>
              <p className="text-xs text-gray-500 mb-4">ชั่วโมงและงบประมาณตามกลุ่มงาน</p>

              <div className="space-y-2.5">
                {deepInsights.topGroups.length > 0 ? (
                  deepInsights.topGroups.map((group, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:bg-emerald-50/70 transition-colors">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-gray-800 truncate">{i + 1}. {group.name}</p>
                        <p className="text-[10px] text-gray-500">{group.hours} ชม.</p>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-xl shrink-0 shadow-2xs border border-emerald-100 font-display">
                        ฿{(group.compensation || 0).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">ข้อมูลจะแสดงเมื่อดูในระดับกองขึ้นไป</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-amber-600" />
                ภารกิจ / เหตุผลที่ขอ OT บ่อยที่สุด
              </h3>
              <p className="text-xs text-gray-500 mb-4">สรุปประเภทงานสำคัญที่ต้องทำนอกเวลา</p>

              <div className="space-y-2.5">
                {deepInsights.topReasons.length > 0 ? (
                  deepInsights.topReasons.map((r, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-amber-50/40 border border-amber-100 flex items-center justify-between hover:bg-amber-50/70 transition-colors">
                      <span className="text-xs font-semibold text-gray-800 line-clamp-1 pr-3">{i + 1}. {r.reason}</span>
                      <span className="text-[11px] font-bold text-amber-800 bg-white px-2.5 py-0.5 rounded-lg shrink-0 shadow-2xs border border-amber-100 font-display">
                        {r.count} ครั้ง
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">ไม่มีข้อมูล</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regulation & Retention Notice Banner */}
      <div className="rounded-2xl bg-slate-100/90 border border-slate-200/90 p-5 text-xs text-slate-600 space-y-2 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>ระเบียบการจ่ายเงินตอบแทนการปฏิบัติงานนอกเวลาราชการ และการเก็บรักษาข้อมูลทางราชการ:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] leading-relaxed">
          <div className="p-3 bg-white rounded-xl border border-slate-200/70">
            <span className="font-bold text-blue-700 block mb-1">๑. วันทำการปกติ</span>
            เบิกจ่ายชั่วโมงละ ๕๐ บาท ปฏิบัติงานนอกเวลาได้ไม่เกิน ๔ ชั่วโมงต่อคนต่อวัน
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/70">
            <span className="font-bold text-purple-700 block mb-1">๒. วันหยุดราชการและสุดสัปดาห์</span>
            เบิกจ่ายชั่วโมงละ ๖๐ บาท ปฏิบัติงานได้ไม่เกิน ๗ ชั่วโมงต่อคนต่อวัน
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/70">
            <span className="font-bold text-emerald-700 block mb-1">๓. การจัดเก็บข้อมูล ๕ ปี</span>
            บันทึกคำร้อง สถิติ และเอกสารหลักฐานทั้งหมดจัดเก็บไว้ไม่น้อยกว่า ๕ ปีงบประมาณตามระเบียบงานสารบรรณ
          </div>
        </div>
      </div>
    </div>
  )
}
