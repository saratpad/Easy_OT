'use server'

import { createClient } from '@supabase/supabase-js'
import { getSessionUser } from './auth'
import { revalidatePath } from 'next/cache'

// Note: Using Service Role key to bypass RLS for administrative actions, 
// as server actions are already protected by session checks.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function certifyBySupervisor(
  requestId: string,
  data: {
    actual_start_time: string | null;
    actual_end_time: string | null;
    actual_total_hours: number | null;
    is_worked: boolean;
  }
) {
  try {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')

    if (!['supervisor', 'director', 'executive', 'super_admin', 'sub_admin'].includes(user.role)) {
      throw new Error('No permission to certify')
    }

    const { error } = await supabase
      .from('ot_requests')
      .update({
        actual_start_time: data.actual_start_time,
        actual_end_time: data.actual_end_time,
        actual_total_hours: data.actual_total_hours,
        is_worked: data.is_worked,
        certification_step: data.is_worked ? 1 : 2, // Move to Director if worked, else Finish
        is_certified: !data.is_worked, // Auto certify if not worked
        certification_note: null // Clear any previous notes
      })
      .eq('id', requestId)

    if (error) throw error

    revalidatePath('/approver')
    return { success: true }
  } catch (error: any) {
    console.error('certifyBySupervisor error:', error)
    return { error: error.message || 'เกิดข้อผิดพลาดในการรับรอง' }
  }
}

export async function reviewByDirector(
  requestId: string,
  action: 'approve' | 'reject' | 'revise',
  note?: string
) {
  try {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')

    if (!['director', 'executive', 'super_admin', 'sub_admin'].includes(user.role)) {
      throw new Error('No permission to review certification')
    }

    let updateData: any = {}

    if (action === 'approve') {
      updateData = {
        certification_step: 2, // Completed
        is_certified: true,
        certification_note: null
      }
    } else if (action === 'reject') {
      updateData = {
        certification_step: -1, // Terminal rejected state
        certification_note: `โดย: ${user.full_name || 'ผู้บังคับบัญชา'}\nเหตุผล: ${note || 'ไม่อนุมัติการรับรอง'}`,
      }
    } else if (action === 'revise') {
      updateData = {
        certification_step: 0, // Back to Supervisor
        certification_note: `ส่งกลับโดย: ${user.full_name || 'ผู้บังคับบัญชา'}\nเหตุผล: ${note || 'ให้แก้ไขข้อมูล'}`
      }
    }

    const { error } = await supabase
      .from('ot_requests')
      .update(updateData)
      .eq('id', requestId)

    if (error) throw error

    revalidatePath('/approver')
    return { success: true }
  } catch (error: any) {
    console.error('reviewByDirector error:', error)
    return { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบการรับรอง' }
  }
}

export async function bulkCertifyBySupervisor(requestIds: string[]) {
  try {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')

    if (!['supervisor', 'director', 'executive', 'super_admin', 'sub_admin'].includes(user.role)) {
      throw new Error('No permission to certify')
    }

    // We can't do a simple update for all if we need to copy start_time to actual_start_time.
    // Wait, bulk certify means they worked the requested hours.
    // Let's fetch the requests first to get their start/end times.
    const { data: requests, error: fetchError } = await supabase
      .from('ot_requests')
      .select('id, start_time, end_time, total_hours, actual_start_time, actual_end_time, actual_total_hours, is_worked')
      .in('id', requestIds)

    if (fetchError) throw fetchError

    for (const req of requests) {
      // If employee didn't report, fallback to requested time.
      // If employee reported "not worked" (is_worked = false), we still respect their report unless the supervisor intended to certify they worked.
      // But if they clicked "Certify", it means they approve the actual time (whether worked or not). Wait, bulkCertify implies "Yes, they worked this".
      // But actually, we should just forward whatever the employee reported.
      // Or if employee didn't report, we use requested time.
      const actStart = req.actual_start_time || req.start_time
      const actEnd = req.actual_end_time || req.end_time
      const actHours = req.actual_total_hours ?? req.total_hours
      const isWorked = req.is_worked ?? true

      await supabase
        .from('ot_requests')
        .update({
          actual_start_time: actStart,
          actual_end_time: actEnd,
          actual_total_hours: actHours,
          is_worked: isWorked,
          certification_step: isWorked ? 1 : 2,
          is_certified: !isWorked,
          certification_note: null
        })
        .eq('id', req.id)
    }

    revalidatePath('/approver')
    return { success: true }
  } catch (error: any) {
    console.error('bulkCertifyBySupervisor error:', error)
    return { error: error.message || 'เกิดข้อผิดพลาดในการรับรอง' }
  }
}

export async function bulkNotWorkedBySupervisor(requestIds: string[]) {
  try {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')

    if (!['supervisor', 'director', 'executive', 'super_admin', 'sub_admin'].includes(user.role)) {
      throw new Error('No permission to certify')
    }

    const { error } = await supabase
      .from('ot_requests')
      .update({
        is_worked: false,
        actual_start_time: null,
        actual_end_time: null,
        actual_total_hours: 0,
        certification_step: 2,
        is_certified: true,
        certification_note: null
      })
      .in('id', requestIds)

    if (error) throw error

    revalidatePath('/approver')
    return { success: true }
  } catch (error: any) {
    console.error('bulkNotWorkedBySupervisor error:', error)
    return { error: error.message || 'เกิดข้อผิดพลาดในการรับรอง' }
  }
}

export async function bulkReviewByDirector(requestIds: string[], action: 'approve' | 'reject' | 'revise', note?: string) {
  try {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')

    if (!['director', 'executive', 'super_admin', 'sub_admin'].includes(user.role)) {
      throw new Error('No permission to review certification')
    }

    let updateData: any = {}

    if (action === 'approve') {
      updateData = {
        certification_step: 2,
        is_certified: true,
        certification_note: null
      }
    } else if (action === 'reject') {
      updateData = {
        certification_step: -1,
        certification_note: `โดย: ${user.full_name || 'ผู้บังคับบัญชา'}\nเหตุผล: ${note || 'ไม่อนุมัติการรับรอง'}`,
      }
    } else if (action === 'revise') {
      updateData = {
        certification_step: 0,
        certification_note: `ส่งกลับโดย: ${user.full_name || 'ผู้บังคับบัญชา'}\nเหตุผล: ${note || 'ให้แก้ไขข้อมูล'}`
      }
    }

    const { error } = await supabase
      .from('ot_requests')
      .update(updateData)
      .in('id', requestIds)

    if (error) throw error

    revalidatePath('/approver')
    return { success: true }
  } catch (error: any) {
    console.error('bulkReviewByDirector error:', error)
    return { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบการรับรอง' }
  }
}
