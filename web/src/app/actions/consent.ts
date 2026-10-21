'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSessionUser } from './auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ConsentType =
  | 'privacy_policy'       // ยอมรับนโยบายความเป็นส่วนตัว
  | 'line_uid_processing'  // ยินยอมใช้ LINE UID
  | 'signature_processing' // ยินยอมใช้ลายมือชื่ออิเล็กทรอนิกส์
  | 'data_deletion_request' // ขอลบข้อมูล

// ─── บันทึกการยินยอม ──────────────────────────────────────────────────────────
export async function recordConsent(params: {
  userId: string
  consentType: ConsentType
  consentGiven: boolean
  method: 'checkbox' | 'button_click' | 'implicit'
  policyVersion?: string
}) {
  const { userId, consentType, consentGiven, method, policyVersion = '1.0' } = params

  const { error } = await supabaseAdmin
    .from('consent_logs')
    .insert({
      user_id: userId,
      consent_type: consentType,
      consent_given: consentGiven,
      method,
      policy_version: policyVersion,
    })

  if (error) {
    console.error('recordConsent error:', error)
    throw new Error('ไม่สามารถบันทึกการยินยอมได้')
  }

  return { success: true }
}

// ─── ดึงสถานะการยินยอมล่าสุดของผู้ใช้ ────────────────────────────────────────
export async function getMyConsentStatus() {
  const user = await getSessionUser()
  if (!user) return null

  const { data } = await supabaseAdmin
    .from('consent_logs')
    .select('consent_type, consent_given, consented_at, policy_version')
    .eq('user_id', user.id)
    .order('consented_at', { ascending: false })

  if (!data) return null

  // ดึงสถานะล่าสุดของแต่ละประเภท
  const latestByType: Record<string, { consent_given: boolean; consented_at: string; policy_version: string }> = {}
  for (const row of data) {
    if (!latestByType[row.consent_type]) {
      latestByType[row.consent_type] = {
        consent_given: row.consent_given,
        consented_at: row.consented_at,
        policy_version: row.policy_version,
      }
    }
  }
  return latestByType
}

// ─── ส่งคำร้องขอลบข้อมูล (สิทธิ์ตาม PDPA ม.33) ───────────────────────────
export async function submitDataDeletionRequest(reason?: string) {
  const user = await getSessionUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อน')
  if (user.id.startsWith('mock-')) throw new Error('ไม่รองรับในโหมดทดสอบ')

  // บันทึกคำร้องใน consent_logs
  const { error } = await supabaseAdmin
    .from('consent_logs')
    .insert({
      user_id: user.id,
      consent_type: 'data_deletion_request' as ConsentType,
      consent_given: true,
      method: 'button_click',
      policy_version: '1.0',
      notes: reason || 'ผู้ใช้งานขอลบข้อมูลส่วนบุคคล',
    })

  if (error) throw new Error('ไม่สามารถส่งคำร้องได้')
  return { success: true }
}

// ─── ถอนความยินยอม LINE UID ────────────────────────────────────────────────
export async function withdrawLineConsent() {
  const user = await getSessionUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อน')
  if (user.id.startsWith('mock-')) throw new Error('ไม่รองรับในโหมดทดสอบ')

  // บันทึกการถอนความยินยอม
  await recordConsent({
    userId: user.id,
    consentType: 'line_uid_processing',
    consentGiven: false,
    method: 'button_click',
  })

  return { success: true, message: 'ถอนความยินยอมสำเร็จ กรุณาติดต่อผู้ดูแลระบบเพื่อดำเนินการต่อ' }
}
