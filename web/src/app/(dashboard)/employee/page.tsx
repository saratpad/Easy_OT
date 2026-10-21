import { createClient } from '@/utils/supabase/server'
import CreateOTModal from './CreateOTModal'
import CancelOTButton from './CancelOTButton'
import MonthSelector from './MonthSelector'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { formatInBangkok, toBangkokTime, getFiscalYearDateRange, getCurrentFiscalYear } from '@/utils/date'
import { getSessionUser } from '@/app/actions/auth'
import { 
  Clock, CheckCircle2, XCircle, AlertCircle, Award, 
  Calendar, FileText, ArrowRight, ShieldCheck, Sparkles 
} from 'lucide-react'

export default async function EmployeeDashboard(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const supabase = await createClient()

  // 1. Get current user
  const user = await getSessionUser()
  if (!user) return null

  const userId = user.id

  let requests: any[] | null = null
  if (!userId.startsWith('mock-')) {
    // 2. Fetch OT Requests for this user
    let query = supabase
      .from('ot_requests')
      .select('*, ot_request_approvals(status, comment, approver:users(full_name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const monthQuery = (typeof searchParams.month === 'string' ? searchParams.month : '') || formatInBangkok(new Date(), 'yyyy-MM')
    
    if (monthQuery !== 'all') {
      if (monthQuery.startsWith('fy-')) {
        const fy = monthQuery.replace('fy-', '')
        const { startIso, endIso } = getFiscalYearDateRange(fy)
        query = query.gte('start_time', startIso).lt('start_time', endIso)
      } else {
        const year = parseInt(monthQuery.split('-')[0])
        const month = parseInt(monthQuery.split('-')[1])
        const nextMonth = month === 12 ? 1 : month + 1
        const nextYear = month === 12 ? year + 1 : year
        
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`
        const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`
        
        query = query.gte('start_time', startDate).lt('start_time', endDate)
      }
    } else {
      // 5 years retention window
      const oldestFY = getCurrentFiscalYear() - 4
      const { startIso } = getFiscalYearDateRange(oldestFY)
      query = query.gte('start_time', startIso)
    }

    try {
      const timeoutPromise = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 800)
      )
      const res = await Promise.race([query, timeoutPromise])
      requests = res.data
    } catch (e) {}
  }

  // Demo fallback for mock test users if database returned nothing
  if ((!requests || requests.length === 0) && userId.startsWith('mock-')) {
    const today = new Date()
    const d1 = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
    const d2 = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
    const d3 = new Date(today.getTime())
    const d4 = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)

    requests = [
      {
        id: 'mock-req-3',
        start_time: `${d3.toISOString().split('T')[0]}T16:30:00+07:00`,
        end_time: `${d3.toISOString().split('T')[0]}T19:30:00+07:00`,
        total_hours: 3.0,
        reason: 'จัดเตรียมเอกสารการประชุมคณะกรรมการประสานงานยุทธศาสตร์',
        status: 'pending',
        current_step: 1,
        certification_step: 0,
        is_worked: true,
        ot_request_approvals: []
      },
      {
        id: 'mock-req-2',
        start_time: `${d2.toISOString().split('T')[0]}T16:30:00+07:00`,
        end_time: `${d2.toISOString().split('T')[0]}T20:30:00+07:00`,
        total_hours: 4.0,
        actual_start_time: `${d2.toISOString().split('T')[0]}T16:30:00+07:00`,
        actual_end_time: `${d2.toISOString().split('T')[0]}T20:30:00+07:00`,
        actual_total_hours: 4.0,
        reason: 'สรุปรายงานผลการปฏิบัติราชการประจำเดือนและวิเคราะห์ตัวชี้วัด',
        status: 'approved',
        current_step: 2,
        certification_step: 1,
        is_worked: true,
        ot_request_approvals: [
          { status: 'approved', approver: { full_name: 'นายสมชาย ใจดี' } }
        ]
      },
      {
        id: 'mock-req-1',
        start_time: `${d1.toISOString().split('T')[0]}T16:30:00+07:00`,
        end_time: `${d1.toISOString().split('T')[0]}T19:30:00+07:00`,
        total_hours: 3.0,
        actual_start_time: `${d1.toISOString().split('T')[0]}T16:30:00+07:00`,
        actual_end_time: `${d1.toISOString().split('T')[0]}T19:30:00+07:00`,
        actual_total_hours: 3.0,
        reason: 'ตรวจทานเอกสารงบประมาณและประสานงานหน่วยงานภายนอก',
        status: 'approved',
        current_step: 2,
        certification_step: 2,
        is_worked: true,
        ot_request_approvals: [
          { status: 'approved', approver: { full_name: 'นายสมเกียรติ มั่นคง' } }
        ]
      },
      {
        id: 'mock-req-4',
        start_time: `${d4.toISOString().split('T')[0]}T16:30:00+07:00`,
        end_time: `${d4.toISOString().split('T')[0]}T19:30:00+07:00`,
        total_hours: 3.0,
        reason: 'จัดทำแบบสำรวจความพึงพอใจการให้บริการ',
        status: 'rejected',
        current_step: 1,
        certification_step: 0,
        is_worked: false,
        ot_request_approvals: [
          { 
            status: 'rejected', 
            approver: { full_name: 'นายสมชาย ใจดี' }, 
            comment: 'ภารกิจสามารถดำเนินการในเวลาทำการปกติได้' 
          }
        ]
      }
    ]
  }

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0
  const approvedRequests = requests?.filter(r => r.status === 'approved') || []
  const approvedHours = approvedRequests.reduce((sum, req) => sum + Number(req.total_hours || 0), 0)
  const certifiedRequests = requests?.filter(r => r.certification_step === 2) || []
  const certifiedHours = certifiedRequests.reduce((sum, req) => sum + Number(req.actual_total_hours || req.total_hours || 0), 0)
  const rejectedCount = requests?.filter(r => r.status === 'rejected').length || 0

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
              คำร้องขอ OT ของฉัน
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold">
              {requests?.length || 0} รายการ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            สร้างและติดตามสถานะคำร้องขอปฏิบัติงานนอกเวลาราชการของคุณ
          </p>
        </div>
        <CreateOTModal />
      </div>

      {/* 4 Modern Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: รออนุมัติ */}
        <div className="glass-card glass-card-hover p-5 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">รออนุมัติ</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-2xs">
              <Clock className="w-5 h-5 animate-soft-pulse" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{pendingCount}</span>
            <span className="text-xs text-slate-400 font-medium">รายการ</span>
          </div>
          <p className="text-[11px] text-amber-600/90 mt-2 flex items-center gap-1">
            <span>● กำลังอยู่ระหว่างพิจารณา</span>
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-amber-400/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
        </div>

        {/* Card 2: อนุมัติแล้ว */}
        <div className="glass-card glass-card-hover p-5 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">อนุมัติแล้ว</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{approvedHours.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-medium">ชม.</span>
          </div>
          <p className="text-[11px] text-emerald-600/90 mt-2 flex items-center gap-1">
            <span>● รวม {approvedRequests.length} คำร้องที่อนุมัติ</span>
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-400/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
        </div>

        {/* Card 3: รับรองเวลาแล้ว */}
        <div className="glass-card glass-card-hover p-5 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">รับรองเวลาแล้ว</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{certifiedHours.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-medium">ชม.</span>
          </div>
          <p className="text-[11px] text-indigo-600/90 mt-2 flex items-center gap-1">
            <span>● พร้อมนำไปออกเอกสารเบิกจ่าย</span>
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-indigo-400/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
        </div>

        {/* Card 4: ไม่อนุมัติ */}
        <div className="glass-card glass-card-hover p-5 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">ไม่อนุมัติ</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 shadow-2xs">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{rejectedCount}</span>
            <span className="text-xs text-slate-400 font-medium">รายการ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            คำร้องที่ไม่ผ่านการพิจารณา
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-rose-400/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 bg-white/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base font-display">ประวัติคำร้องขอ OT</h3>
            <p className="text-xs text-slate-500 mt-0.5">เลือกช่วงเวลาเพื่อดูประวัติคำร้องย้อนหลัง</p>
          </div>
          <MonthSelector />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-400 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">วันที่ทำ OT</th>
                <th className="px-6 py-4">เวลาขอ / เวลาทำจริง</th>
                <th className="px-6 py-4">เหตุผล / ภารกิจ</th>
                <th className="px-6 py-4">สถานะคำขอ</th>
                <th className="px-6 py-4">สถานะรับรอง</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/60">
              {requests?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 mx-auto flex items-center justify-center">
                        <FileText className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">ไม่มีประวัติคำร้องขอ OT</h4>
                      <p className="text-xs text-slate-500">
                        ยังไม่มีคำร้องขอทำงานล่วงเวลาในช่วงเวลาที่เลือก คุณสามารถกดปุ่มสร้างคำร้องใหม่ได้ทันที
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests?.map((req: any) => {
                  const rejectedApproval = req.status === 'rejected' 
                    ? req.ot_request_approvals?.find((a: any) => a.status === 'rejected') 
                    : null
                  
                  const reqDate = toBangkokTime(req.start_time)
                  const dayNum = reqDate.getDate()
                  const monthName = format(reqDate, 'MMM', { locale: th })
                  const yearThai = reqDate.getFullYear() + 543

                  return (
                    <tr key={req.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Date Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-100/80 flex flex-col items-center justify-center text-center shadow-2xs shrink-0">
                            <span className="text-[10px] font-bold text-blue-600 uppercase leading-none">{monthName}</span>
                            <span className="text-base font-extrabold text-slate-900 leading-tight font-display">{dayNum}</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {dayNum} {format(reqDate, 'MMMM', { locale: th })} {yearThai}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {format(reqDate, 'EEEE', { locale: th })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span className="text-slate-400">ขอ:</span>
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                              {formatInBangkok(req.start_time, 'HH:mm')} - {formatInBangkok(req.end_time, 'HH:mm')} น.
                            </span>
                            <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md text-[11px]">
                              {req.total_hours} ชม.
                            </span>
                          </div>

                          {req.status === 'approved' && (
                            <div className="text-xs">
                              {req.is_worked === false ? (
                                <span className="text-rose-600 font-medium">ไม่ได้ปฏิบัติงาน</span>
                              ) : req.actual_start_time ? (
                                <div className="flex items-center gap-1.5 text-emerald-700 font-medium mt-0.5">
                                  <span className="text-slate-400">ทำจริง:</span>
                                  <span className="font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                    {formatInBangkok(req.actual_start_time, 'HH:mm')} - {formatInBangkok(req.actual_end_time, 'HH:mm')} น.
                                  </span>
                                  <span className="font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md text-[11px]">
                                    {req.actual_total_hours} ชม.
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed" title={req.reason}>
                          {req.reason}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                            req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            req.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            req.status === 'cancelled' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {req.status === 'approved' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>อนุมัติแล้ว</span>
                              </>
                            ) : req.status === 'rejected' ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>ไม่อนุมัติ</span>
                              </>
                            ) : req.status === 'cancelled' ? (
                              <>
                                <span>ยกเลิกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 animate-soft-pulse" />
                                <span>รออนุมัติ (ขั้นที่ {req.current_step})</span>
                              </>
                            )}
                          </span>

                          {req.status === 'rejected' && rejectedApproval && (
                            <div className="text-[11px] text-rose-600 mt-1 whitespace-normal p-2 bg-rose-50/50 rounded-xl border border-rose-100">
                              <span className="font-semibold">ผู้ไม่อนุมัติ:</span> {rejectedApproval.approver?.full_name || 'ไม่ทราบชื่อ'} <br/>
                              <span className="font-semibold">เหตุผล:</span> {rejectedApproval.comment || 'ไม่มีการระบุเหตุผล'}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Certification */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {req.status === 'approved' ? (() => {
                          if (req.certification_step === 2) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Award className="w-3.5 h-3.5" />
                                รับรองแล้ว
                              </span>
                            )
                          }
                          
                          if (req.certification_step === -1) {
                            return (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  ปฏิเสธรับรอง
                                </span>
                                <div className="text-[11px] text-rose-600 mt-0.5 whitespace-pre-line">
                                  {req.certification_note || 'ไม่ระบุเหตุผล'}
                                </div>
                              </div>
                            )
                          }
                          
                          if (req.certification_step === 1) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3.5 h-3.5" />
                                รอ ผอ.กอง
                              </span>
                            )
                          }

                          if (req.actual_start_time === null && req.is_worked === true) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <Sparkles className="w-3.5 h-3.5" />
                                รอลงเวลา
                              </span>
                            )
                          }

                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              รอ ผอ.กลุ่ม
                            </span>
                          )
                        })() : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {req.status === 'pending' ? (
                          <CancelOTButton requestId={req.id} />
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
