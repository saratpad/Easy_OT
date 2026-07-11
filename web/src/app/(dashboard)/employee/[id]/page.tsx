import { createClient } from '@/utils/supabase/server'
import { getSessionUser } from '@/app/actions/auth'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle2, XCircle, FileText, Calendar, AlertCircle } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function OTRequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const user = await getSessionUser()

  if (!user) return null

  // Fetch request details
  const { data: request } = await supabase
    .from('ot_requests')
    .select('*, user:users(full_name, position), division:divisions(name)')
    .eq('id', params.id)
    .single()

  if (!request) {
    return notFound()
  }

  // Security check: Only the owner or an admin/approver from the same division can view
  const isOwner = request.user_id === user.id
  const isSuperAdmin = user.role === 'super_admin'
  const isSameDivision = request.division_id === user.division_id
  const hasAccess = isOwner || isSuperAdmin || isSameDivision

  if (!hasAccess) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-gray-500 mt-2">คุณไม่สามารถดูรายละเอียดคำร้องนี้ได้</p>
        <Link href="/employee" className="mt-6 inline-block text-blue-600 font-medium hover:underline">
          กลับหน้าหลัก
        </Link>
      </div>
    )
  }

  // Fetch approval history
  const { data: approvals } = await supabase
    .from('ot_request_approvals')
    .select('*, approver:users(full_name, position, role)')
    .eq('request_id', request.id)
    .order('step_order', { ascending: true })

  // Fetch approval routes to show the full timeline expectation
  const { data: routes } = await supabase
    .from('approval_routes')
    .select('*')
    .eq('division_id', request.division_id)
    .order('step_order', { ascending: true })

  // Build timeline data
  const timeline = routes?.map(route => {
    const approval = approvals?.find(a => a.step_order === route.step_order)
    return {
      step_order: route.step_order,
      target_role: route.target_role,
      status: approval ? approval.status : (request.current_step === route.step_order && request.status === 'pending' ? 'pending' : 'waiting'),
      approver: approval ? approval.approver : null,
      acted_at: approval ? approval.acted_at : null,
      comment: approval ? approval.comment : null,
    }
  }) || []

  // Formatting dates
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">อนุมัติแล้ว</span>
      case 'rejected': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium border border-red-200">ไม่อนุมัติ</span>
      case 'cancelled': return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">ยกเลิก</span>
      case 'pending': return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium border border-yellow-200">รออนุมัติ</span>
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{status}</span>
    }
  }

  const roleLabels: Record<string, string> = {
    'supervisor': 'ผู้อำนวยการกลุ่ม',
    'director': 'ผู้อำนวยการกอง',
    'executive': 'ผู้บริหารที่กำกับดูแล',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/employee" className="p-2 bg-white text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายละเอียดคำร้อง OT</h1>
          <p className="text-sm text-gray-500">ปีงบประมาณ {request.fiscal_year}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                ข้อมูลคำร้อง
              </h2>
              {getStatusBadge(request.status)}
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">ผู้ยื่นคำร้อง</p>
                  <p className="font-medium text-gray-900">{request.user?.full_name}</p>
                  <p className="text-xs text-gray-500">{request.user?.position}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">กอง/สำนัก</p>
                  <p className="font-medium text-gray-900">{request.division?.name}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">วันที่และเวลา</p>
                <div className="flex items-center space-x-2 text-gray-900 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{formatDateTime(request.start_time)}</span>
                  <span className="text-gray-400">ถึง</span>
                  <span className="font-medium">{formatDateTime(request.end_time)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">จำนวนชั่วโมง</p>
                  <p className="font-bold text-2xl text-gray-900">{request.total_hours} <span className="text-base font-normal text-gray-500">ชม.</span></p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">ภารกิจ/เหตุผลความจำเป็น</p>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm whitespace-pre-wrap border border-gray-100">
                  {request.reason || '- ไม่ได้ระบุ -'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-500" />
                สถานะการอนุมัติ
              </h2>
            </div>
            
            <div className="p-6">
              <div className="relative border-l border-gray-200 ml-3 space-y-6">
                
                {/* Submit Step */}
                <div className="relative pl-6">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
                  <p className="text-sm font-semibold text-gray-900">ยื่นคำร้อง</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(request.created_at)}</p>
                </div>

                {/* Approval Steps */}
                {timeline.map((step, index) => {
                  let dotClass = "bg-gray-200" // waiting
                  let titleClass = "text-gray-500"
                  let icon = null

                  if (step.status === 'approved') {
                    dotClass = "bg-green-500"
                    titleClass = "text-green-700 font-semibold"
                    icon = <CheckCircle2 className="w-4 h-4 text-green-500 absolute -left-2 top-1 bg-white" />
                  } else if (step.status === 'rejected') {
                    dotClass = "bg-red-500"
                    titleClass = "text-red-700 font-semibold"
                    icon = <XCircle className="w-4 h-4 text-red-500 absolute -left-2 top-1 bg-white" />
                  } else if (step.status === 'pending') {
                    dotClass = "bg-yellow-400 animate-pulse"
                    titleClass = "text-yellow-700 font-semibold"
                  }

                  return (
                    <div key={index} className="relative pl-6">
                      {icon ? icon : (
                        <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${dotClass}`}></div>
                      )}
                      
                      <p className={`text-sm ${titleClass}`}>
                        {roleLabels[step.target_role] || step.target_role}
                      </p>
                      
                      {step.status === 'pending' && (
                        <p className="text-xs text-yellow-600 mt-0.5 bg-yellow-50 inline-block px-2 py-0.5 rounded border border-yellow-100">รอการพิจารณา</p>
                      )}
                      
                      {step.approver && (
                        <div className="mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          <p className="text-xs font-medium text-gray-900">{step.approver.full_name}</p>
                          {step.acted_at && (
                            <p className="text-[10px] text-gray-500 mt-0.5">{formatDateTime(step.acted_at)}</p>
                          )}
                          {step.comment && (
                            <p className="text-xs text-gray-700 mt-1.5 pt-1.5 border-t border-gray-200">
                              <span className="text-gray-500">หมายเหตุ:</span> {step.comment}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
