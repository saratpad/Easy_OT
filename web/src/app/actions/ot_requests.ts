'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/app/actions/auth'

export async function createOTRequest(formData: FormData) {
  const supabase = await createClient()

  // 1. Get current user from session (ต้อง login จริงเท่านั้น)
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized — กรุณาเข้าสู่ระบบก่อน')

  const userId = user.id

  if (!user.division_id) {
    throw new Error('User division not found — กรุณาติดต่อผู้ดูแลระบบ')
  }

  const startTime = formData.get('start_time') as string
  const endTime = formData.get('end_time') as string
  const reason = formData.get('reason') as string
  const totalHours = Number(formData.get('total_hours'))

  // คำนวณปีงบประมาณ (ต.ค. ปีก่อน — ก.ย. ปีนี้)
  // เดือน 10 (ต.ค.) ถึง 12 (ธ.ค.) → ปีงบประมาณ = ปีถัดไป (+543 สำหรับ พ.ศ.)
  const date = new Date(startTime)
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  const fiscalYear = month >= 10
    ? (year + 1).toString()
    : year.toString()

  // 1.5 ตรวจสอบว่าผู้ขออยู่ในสายการอนุมัติหรือไม่ (เช่น เป็นผู้อำนวยการกลุ่มขอเอง)
  // ถ้าใช่ ให้เริ่มที่ลำดับถัดไปเลย
  let currentStep = 1
  const { data: routes } = await supabase
    .from('approval_routes')
    .select('*')
    .eq('division_id', user.division_id)
    .order('step_order', { ascending: true })

  if (routes && routes.length > 0) {
    const matchingStep = routes.find(r => r.target_role === user.role)
    if (matchingStep) {
      currentStep = matchingStep.step_order + 1
    }
  }

  const { error } = await supabase
    .from('ot_requests')
    .insert({
      user_id: userId,
      division_id: user.division_id,
      group_id: user.group_id,
      fiscal_year: fiscalYear,
      start_time: startTime,
      end_time: endTime,
      total_hours: totalHours,
      reason,
      current_step: currentStep,
      status: 'pending',
    })

  if (error) {
    console.error('Error creating OT request:', error)
    throw new Error('Failed to create OT request')
  }

  revalidatePath('/employee')
  return { success: true }
}

export async function cancelOTRequest(requestId: string) {
  const supabase = await createClient()

  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')

  // ตรวจสอบว่าเป็นเจ้าของ request
  const { data: request } = await supabase
    .from('ot_requests')
    .select('user_id, status')
    .eq('id', requestId)
    .single()

  if (!request) throw new Error('Request not found')
  if (request.user_id !== user.id) throw new Error('ไม่มีสิทธิ์ยกเลิกคำร้องนี้')
  if (request.status !== 'pending') throw new Error('ยกเลิกได้เฉพาะคำร้องที่รออนุมัติเท่านั้น')

  const { error } = await supabase
    .from('ot_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)

  if (error) throw new Error('Failed to cancel OT request')

  revalidatePath('/employee')
  return { success: true }
}

export async function updateOTRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  comment: string
) {
  const supabase = await createClient()

  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')

  const approverId = user.id

  // 1. ดึง request ปัจจุบัน
  const { data: request, error: fetchErr } = await supabase
    .from('ot_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchErr || !request) throw new Error('Request not found')

  // 2. บันทึก approval step นี้
  await supabase
    .from('ot_request_approvals')
    .insert({
      request_id: requestId,
      approver_id: approverId,
      step_order: request.current_step,
      status,
      comment,
      acted_at: new Date().toISOString(),
    })

  // 3. อัพเดท request หลัก
  if (status === 'rejected') {
    await supabase
      .from('ot_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
  } else if (status === 'approved') {
    // ตรวจสอบว่ามี step ถัดไปหรือไม่
    const { data: nextStep } = await supabase
      .from('approval_routes')
      .select('*')
      .eq('division_id', request.division_id)
      .eq('step_order', request.current_step + 1)
      .single()

    if (nextStep) {
      // เลื่อนไป step ถัดไป
      await supabase
        .from('ot_requests')
        .update({ current_step: request.current_step + 1 })
        .eq('id', requestId)
    } else {
      // อนุมัติครบทุก step → final approved
      await supabase
        .from('ot_requests')
        .update({ status: 'approved' })
        .eq('id', requestId)

      // ส่ง LINE notification ให้กองทราบ (แจ้งว่ามีคำร้องอนุมัติแล้ว)
      await sendLineNotification(request, supabase)
    }
  }

  revalidatePath('/approver')
  revalidatePath('/employee')
  return { success: true }
}

// ─── Helper: LINE Notification ─────────────────────────────────────────────
async function sendLineNotification(request: any, supabase: any) {
  try {
    const { data: divData } = await supabase
      .from('divisions')
      .select('line_channel_access_token, line_target_id, line_notifications_enabled')
      .eq('id', request.division_id)
      .single()

    if (!divData?.line_channel_access_token || !divData?.line_target_id) return
    if (divData.line_notifications_enabled === false) return

    const { data: fullRequest } = await supabase
      .from('ot_requests')
      .select('*, user:users(full_name, position)')
      .eq('id', request.id)
      .single()

    if (!fullRequest) return

    const startDate = new Date(fullRequest.start_time).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    const message = `🔔 คำร้องขออนุมัติ OT ของคุณ ${fullRequest.user?.full_name}\n`
      + `ได้รับการพิจารณาอนุมัติจากผู้บริหารครบถ้วนทุกขั้นตอนแล้ว!\n\n`
      + `👉 ขอความกรุณาผู้ดูแลภายในกอง ตรวจสอบและดำเนินการออกบันทึกข้อความต่อไป`

    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${divData.line_channel_access_token}`,
      },
      body: JSON.stringify({
        to: divData.line_target_id,
        messages: [{ type: 'text', text: message }],
      }),
    })
  } catch (err) {
    console.error('Failed to send LINE notification:', err)
  }
}

// ─── Helper: Get Recent OT Reasons for Division ────────────────────────────
export async function getRecentReasons(): Promise<string[]> {
  const supabase = await createClient()
  const user = await getSessionUser()
  if (!user || !user.division_id) return []

  // คำนวณวันที่ย้อนหลัง 1 เดือน
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  // ดึง reason จาก 100 คำร้องล่าสุดในกองเดียวกัน ในระยะเวลา 1 เดือน ที่ไม่ซ้ำกัน
  const { data } = await supabase
    .from('ot_requests')
    .select('reason')
    .eq('division_id', user.division_id)
    .gte('created_at', oneMonthAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  if (!data) return []

  // กรองเฉพาะอันที่ไม่ซ้ำกัน
  const uniqueReasons = Array.from(new Set(data.map(r => r.reason).filter(Boolean)))
  return uniqueReasons
}
