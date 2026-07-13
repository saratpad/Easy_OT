import { createClient } from '@/utils/supabase/server'
import CreateOTModal from './CreateOTModal'
import CancelOTButton from './CancelOTButton'
import MonthSelector from './MonthSelector'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { formatInBangkok, toBangkokTime } from '@/utils/date'

import { getSessionUser } from '@/app/actions/auth'

export default async function EmployeeDashboard(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const supabase = await createClient()

  // 1. Get current user from LIFF session
  const user = await getSessionUser()
  if (!user) return null // Handled by middleware

  const userId = user.id

  // 2. Fetch OT Requests for this user
  let query = supabase
    .from('ot_requests')
    .select('*, ot_request_approvals(status, comment, approver:users(full_name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const monthQuery = (typeof searchParams.month === 'string' ? searchParams.month : '') || formatInBangkok(new Date(), 'yyyy-MM')
  
  if (monthQuery !== 'all') {
    const year = parseInt(monthQuery.split('-')[0])
    const month = parseInt(monthQuery.split('-')[1])
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`
    const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`
    
    query = query.gte('start_time', startDate).lt('start_time', endDate)
  }

  const { data: requests } = await query

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0
  const approvedRequests = requests?.filter(r => r.status === 'approved') || []
  const approvedHours = approvedRequests.reduce((sum, req) => sum + Number(req.total_hours), 0)
  const rejectedCount = requests?.filter(r => r.status === 'rejected').length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">คำร้องขอ OT ของฉัน</h2>
          <p className="text-sm text-gray-500 mt-1">จัดการและติดตามสถานะการขอทำงานล่วงเวลาของคุณ</p>
        </div>
        <CreateOTModal />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">รออนุมัติ</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">อนุมัติแล้ว (ทั้งหมด)</h3>
          <p className="text-3xl font-bold text-green-500 mt-2">{approvedHours}<span className="text-sm font-normal text-gray-400 ml-1">ชม.</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">ไม่อนุมัติ</h3>
          <p className="text-3xl font-bold text-red-500 mt-2">{rejectedCount}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-semibold text-gray-800">ประวัติคำร้องล่าสุด</h3>
          <MonthSelector />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3.5 font-medium">วันที่ขอ OT</th>
                <th className="px-6 py-3.5 font-medium">เวลาขอ / ทำจริง</th>
                <th className="px-6 py-3.5 font-medium">เหตุผล</th>
                <th className="px-6 py-3.5 font-medium">สถานะคำขอ</th>
                <th className="px-6 py-3.5 font-medium">สถานะรับรอง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {requests?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">ไม่มีประวัติการขอ OT</td>
                </tr>
              ) : (
                requests?.map((req: any) => {
                  const rejectedApproval = req.status === 'rejected' 
                    ? req.ot_request_approvals?.find((a: any) => a.status === 'rejected') 
                    : null
                  
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {`${formatInBangkok(req.start_time, 'dd MMM')} ${toBangkokTime(req.start_time).getFullYear() + 543}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-900">
                            ขอ: {formatInBangkok(req.start_time, 'HH:mm')} - {formatInBangkok(req.end_time, 'HH:mm')} น. ({req.total_hours} ชม.)
                          </span>
                          {req.status === 'approved' && (
                            <span className="text-sm">
                              {req.is_worked === false ? (
                                <span className="text-red-600">ไม่ได้ปฏิบัติงาน</span>
                              ) : req.actual_start_time ? (
                                <span className="text-green-600 font-medium">
                                  ทำจริง: {formatInBangkok(req.actual_start_time, 'HH:mm')} - {formatInBangkok(req.actual_end_time, 'HH:mm')} น. ({req.actual_total_hours} ชม.)
                                </span>
                              ) : null}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 truncate max-w-xs">{req.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                              req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                              req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              req.status === 'cancelled' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                              'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {req.status === 'approved' ? 'อนุมัติแล้ว' : 
                               req.status === 'rejected' ? 'ไม่อนุมัติ' : 
                               req.status === 'cancelled' ? 'ยกเลิกแล้ว' :
                               `รออนุมัติ (ขั้นที่ ${req.current_step})`}
                            </span>
                            {req.status === 'pending' && <CancelOTButton requestId={req.id} />}
                          </div>
                          {req.status === 'rejected' && rejectedApproval && (
                            <div className="text-xs text-red-600 mt-1 whitespace-normal">
                              โดย: {rejectedApproval.approver?.full_name || 'ไม่ทราบชื่อ'} <br/>
                              เหตุผล: {rejectedApproval.comment || 'ไม่มีการระบุเหตุผล'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {req.status === 'approved' ? (() => {
                          if (req.certification_step === 2) return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-green-50 text-green-700 border-green-200 w-fit">รับรองแล้ว</span>
                          
                          if (req.certification_step === -1) return (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-red-50 text-red-700 border-red-200 w-fit">ปฏิเสธรับรอง</span>
                              <div className="text-xs text-red-600 mt-1 whitespace-pre-line">
                                {req.certification_note || 'ไม่ระบุเหตุผล'}
                              </div>
                            </div>
                          )
                          
                          if (req.certification_step === 1) return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200 w-fit">รอ ผอ.กอง</span>
                          if (req.actual_start_time === null && req.is_worked === true) return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 w-fit">รอลงเวลา</span>
                          return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200 w-fit">รอ ผอ.กลุ่ม</span>
                        })() : <span className="text-gray-400">-</span>}
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
