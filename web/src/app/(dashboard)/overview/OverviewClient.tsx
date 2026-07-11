'use client'

import { OverviewData } from '@/app/actions/overview'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { BarChart3, Bot, CheckCircle, Clock, FileText, Sparkles, Users, User, ShieldAlert, Zap } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

import { useRouter, useSearchParams } from 'next/navigation'

export default function OverviewClient({ 
  overviewData, 
  role, 
  divisions = [], 
  groups = [], 
  selectedDivisionId = '', 
  selectedGroupId = '',
  scopeName = ''
}: { 
  overviewData: OverviewData | null, 
  role: string,
  divisions?: any[],
  groups?: any[],
  selectedDivisionId?: string,
  selectedGroupId?: string,
  scopeName?: string
}) {
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  if (!overviewData) {
    return <div className="p-8 text-center text-gray-500">ไม่สามารถโหลดข้อมูลได้</div>
  }

  const { deepInsights } = overviewData

  // Format month for display
  const formattedChartData = overviewData.chartData.map(d => {
    const [y, m] = d.month.split('-')
    const date = new Date(parseInt(y), parseInt(m) - 1)
    return {
      ...d,
      monthLabel: `${format(date, 'MMM', { locale: th })} ${(date.getFullYear() + 543).toString().slice(2)}`
    }
  })

  const handleFilterChange = (type: 'division' | 'group', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type === 'division') {
      if (value) params.set('division_id', value)
      else params.delete('division_id')
      // Reset group when division changes
      params.delete('group_id')
    } else if (type === 'group') {
      if (value) params.set('group_id', value)
      else params.delete('group_id')
    }
    
    router.push(`/overview?${params.toString()}`)
  }

  const handleAskAI = async () => {
    const dataStr = overviewData.chartData.map(d => `${d.month}: ${d.hours} ชม.`).join(', ')
    const topUsersStr = deepInsights.topUsers.map(u => `- ${u.name}: ${u.hours} ชม.`).join('\n')
    const topGroupsStr = deepInsights.topGroups.map(g => `- ${g.name}: ${g.hours} ชม.`).join('\n')
    const topReasonsStr = deepInsights.topReasons.map(r => `- ${r.reason} (${r.count} ครั้ง)`).join('\n')
    const positionDistStr = deepInsights.positionDistribution.map(p => `- ${p.position}: ${p.hours} ชม.`).join('\n')
    const timeDistStr = deepInsights.timeOfDayDistribution.map(t => `- ${t.time}: ${t.hours} ชม.`).join('\n')

    const prompt = `ในฐานะที่ฉันเป็นผู้บริหาร นี่คือข้อมูลเชิงลึก (Deep Insights) ของการทำงานล่วงเวลา (OT) ในขอบเขตข้อมูล "${scopeName}" ในช่วง 6 เดือนที่ผ่านมา:

1. สรุปภาพรวม:
- คำร้องทั้งหมด: ${overviewData.totalRequests} รายการ
- อนุมัติไปแล้วรวม: ${overviewData.totalApprovedHours} ชั่วโมง (เฉลี่ย ${deepInsights.averageDuration} ชั่วโมง/คำร้อง)
- รายละเอียดชั่วโมง OT แต่ละเดือน: ${dataStr}

2. ใคร/ตำแหน่งใด ที่ทำ OT มากที่สุด (Top Requesters & Positions):
${topUsersStr}
การกระจายตามระดับตำแหน่ง:
${positionDistStr}

3. ทำอะไร (Top Reasons for OT):
${topReasonsStr}

4. กลุ่มไหนทำ OT สูงสุด (Top Groups):
${topGroupsStr || '- ไม่มีข้อมูลระดับกลุ่ม หรือเป็นข้อมูลส่วนบุคคล'}

5. ทำเวลาไหนบ่อยที่สุด (Time Distribution):
${timeDistStr}

โปรดวิเคราะห์ข้อมูลเชิงลึกนี้ว่า:
1. ภาระงานกระจุกตัวที่ใคร กลุ่มไหน หรือระดับใดเกินไปหรือไม่?
2. เหตุผลการทำ OT และช่วงเวลา สอดคล้องกับพฤติกรรมที่ควรจะเป็นหรือไม่?
3. โปรดให้ข้อเสนอแนะเชิงบริหารในการลดต้นทุน, การจัดสรรกำลังคน, ปรับปรุงกระบวนการทำงาน หรือแนวทางลดภาระงานให้ดีขึ้น`

    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      alert('✅ ระบบได้ทำการวิเคราะห์ข้อมูลเชิงลึก และคัดลอกข้อมูลสรุป (Prompt) ไว้ให้คุณแล้ว\n\nเมื่อหน้าต่าง Gemini เปิดขึ้นมา กรุณากด "วาง" (Paste / Ctrl+V) ในช่องข้อความเพื่อส่งข้อมูลให้ AI ได้เลยครับ')
      setTimeout(() => setCopied(false), 4000)
      window.open('https://gemini.google.com/', '_blank')
    } catch (err) {
      console.error('Failed to copy', err)
      alert('ไม่สามารถคัดลอกข้อความได้ กรุณาลองอีกครั้ง หรือใช้เบราว์เซอร์อื่น')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            ข้อมูลเชิงลึกการทำงานล่วงเวลา (OT Deep Insights)
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200 whitespace-nowrap">
              ขอบเขตข้อมูล: {scopeName}
            </span>
            <div className="flex gap-2 flex-wrap">
              {(role === 'executive' || role === 'super_admin') && (
                <select
                  value={selectedDivisionId}
                  onChange={(e) => handleFilterChange('division', e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">-- ทุกกอง (ระดับองค์กร) --</option>
                  {divisions.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}

              {(role === 'executive' || role === 'super_admin' || role === 'director' || role === 'sub_admin') && (
                <select
                  value={selectedGroupId}
                  onChange={(e) => handleFilterChange('group', e.target.value)}
                  disabled={!selectedDivisionId && (role === 'executive' || role === 'super_admin')}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:opacity-50 disabled:bg-gray-100"
                >
                  <option value="">-- ทุกกลุ่มงานในกอง --</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleAskAI}
          className="group relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-300 font-bold text-base overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          {copied ? <CheckCircle className="w-5 h-5 relative z-10 animate-pulse" /> : <Sparkles className="w-5 h-5 relative z-10" />}
          <span className="relative z-10">{copied ? 'คัดลอกแล้ว! กรุณากด Paste ใน Gemini' : '✨ วิเคราะห์เชิงลึกด้วย AI (Gemini)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">คำร้องทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-900">{overviewData.totalRequests}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">ชั่วโมงที่อนุมัติแล้ว</p>
            <p className="text-2xl font-bold text-gray-900">{overviewData.totalApprovedHours}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">เฉลี่ยต่อคำร้อง</p>
            <p className="text-2xl font-bold text-gray-900">{deepInsights.averageDuration} <span className="text-base font-normal">ชม.</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1"><ShieldAlert className="w-4 h-4 text-orange-500" /> สถานะคำร้อง</p>
          <div className="flex items-center gap-3 text-sm">
            {overviewData.statusData.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                <span className="font-semibold text-gray-800">{s.value}</span>
                <span className="text-gray-500 text-xs hidden sm:inline">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart (Stock Market Style) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            📈 แนวโน้มชั่วโมง OT (6 เดือนย้อนหลัง)
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 500}} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value || 0} ชั่วโมง`, 'รวมอนุมัติ']}
                  cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#2563eb" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorHours)" 
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#1d4ed8' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Divisions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🏢 กองที่ทำ OT สูงสุด (Top 5)
          </h3>
          <div className="space-y-4 flex-1">
            {deepInsights.topDivisions && deepInsights.topDivisions.length > 0 ? deepInsights.topDivisions.map((div, i) => (
              <div key={i} className="flex justify-between items-center pb-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700 truncate pr-4">{i + 1}. {div.name}</span>
                <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{div.hours} ชม.</span>
              </div>
            )) : <div className="text-gray-400 text-sm text-center py-4">ไม่มีข้อมูล</div>}
          </div>
        </div>
      </div>

      {/* Deep Insights Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Users & Roles */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" /> ใครทำ OT มากที่สุด (Top 5)
          </h3>
          <div className="space-y-4">
            {deepInsights.topUsers.length > 0 ? deepInsights.topUsers.map((user, i) => (
              <div key={i} className="flex justify-between items-center pb-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700 truncate pr-4">{i + 1}. {user.name}</span>
                <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{user.hours} ชม.</span>
              </div>
            )) : <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>}
          </div>

          <h3 className="text-md font-bold text-gray-800 mt-6 mb-3 border-t pt-4">สัดส่วนตามตำแหน่ง (Position)</h3>
          <div className="space-y-4">
            {deepInsights.positionDistribution.length > 0 ? deepInsights.positionDistribution.map((pos, i) => (
              <div key={i} className="flex justify-between items-center pb-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700 truncate pr-4" title={pos.position}>
                  {i + 1}. {pos.position}
                </span>
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded shrink-0">
                  {pos.hours} ชม.
                </span>
              </div>
            )) : <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>}
          </div>
        </div>

        {/* Time Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" /> ช่วงเวลาที่ทำ OT บ่อยที่สุด
          </h3>
          
          <h4 className="text-sm font-semibold text-gray-600 mb-2">วันในสัปดาห์ (Mon-Sun)</h4>
          <div className="h-[140px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deepInsights.weekdayDistribution} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [`${value} ชม.`, 'เวลา']}/>
                <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h4 className="text-sm font-semibold text-gray-600 mb-2 border-t pt-4">ช่วงเวลาของวัน</h4>
          <div className="grid grid-cols-2 gap-3">
            {deepInsights.timeOfDayDistribution.map((t, i) => (
              <div key={i} className="bg-purple-50/50 border border-purple-100 p-3 rounded-xl flex flex-col">
                <span className="text-xs text-purple-600 font-medium mb-1">{t.time}</span>
                <span className="text-lg font-bold text-purple-900">{t.hours} <span className="text-xs font-normal">ชม.</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Groups & Reasons */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" /> กลุ่มงานไหนทำ OT เยอะสุด
              </h3>
              <div className="space-y-3">
                {deepInsights.topGroups.length > 0 ? deepInsights.topGroups.map((group, i) => (
                  <div key={i} className="flex justify-between items-center pb-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 truncate pr-4">{i + 1}. {group.name}</span>
                    <span className="text-sm font-semibold text-emerald-600">{group.hours} ชม.</span>
                  </div>
                )) : <p className="text-sm text-gray-500">ข้อมูลจะแสดงเมื่อดูในระดับกองขึ้นไป</p>}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> ทำอะไร (เหตุผลบ่อยสุด)
              </h3>
              <div className="space-y-3">
                {deepInsights.topReasons.length > 0 ? deepInsights.topReasons.map((r, i) => (
                  <div key={i} className="flex flex-col pb-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 line-clamp-1">{i + 1}. {r.reason}</span>
                    <span className="text-xs text-amber-600 mt-1">ถูกอ้างถึง {r.count} ครั้ง</span>
                  </div>
                )) : <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
