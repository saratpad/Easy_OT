'use server'

import { createClient } from '@supabase/supabase-js'
import { getSessionUser } from './auth'
import { revalidatePath } from 'next/cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function getUnreportedOTRequests() {
  try {
    const user = await getSessionUser()
    if (!user) return { data: [] }

    const nowISO = new Date().toISOString()

    const { data, error } = await supabase
      .from('ot_requests')
      .select('id, start_time, end_time, reason, total_hours')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .lt('end_time', nowISO)
      .is('actual_start_time', null)
      .eq('is_worked', true)
      .or('certification_step.eq.0,certification_step.eq.-1')
      .order('end_time', { ascending: true })

    if (error) {
      console.error('getUnreportedOTRequests error:', error)
      return { data: [] }
    }

    return { data: data || [] }
  } catch (error) {
    console.error('getUnreportedOTRequests error:', error)
    return { data: [] }
  }
}

export async function submitEmployeeOTReport(
  requestId: string,
  data: {
    is_worked: boolean
    actual_start_time?: string
    actual_end_time?: string
    actual_total_hours?: number
  }
) {
  try {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')

    const { data: request, error: fetchError } = await supabase
      .from('ot_requests')
      .select('user_id')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) throw new Error('ไม่พบคำขอ OT')
    if (request.user_id !== user.id) throw new Error('ไม่มีสิทธิ์เข้าถึงคำขอนี้')

    let updatePayload: any = {
      is_worked: data.is_worked,
    }

    if (data.is_worked) {
      if (!data.actual_start_time || !data.actual_end_time || typeof data.actual_total_hours !== 'number') {
        throw new Error('กรุณาระบุเวลาปฏิบัติงานจริงให้ครบถ้วน')
      }
      updatePayload.actual_start_time = data.actual_start_time
      updatePayload.actual_end_time = data.actual_end_time
      updatePayload.actual_total_hours = data.actual_total_hours
    } else {
      updatePayload.actual_start_time = null
      updatePayload.actual_end_time = null
      updatePayload.actual_total_hours = 0
      updatePayload.certification_step = 2 // Finished
      updatePayload.is_certified = true
    }

    const { error: updateError } = await supabase
      .from('ot_requests')
      .update(updatePayload)
      .eq('id', requestId)

    if (updateError) throw updateError

    revalidatePath('/')
    revalidatePath('/approver')
    
    return { success: true }
  } catch (error: any) {
    console.error('submitEmployeeOTReport error:', error)
    return { error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }
  }
}
