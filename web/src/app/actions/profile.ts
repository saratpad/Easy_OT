'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from './auth'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function updateMyProfile(data: {
  full_name?: string
  position?: string
  username?: string
  password?: string
  signature_url?: string | null
}) {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const updateData: any = {}
  
  if (data.full_name !== undefined) updateData.full_name = data.full_name
  if (data.position !== undefined) updateData.position = data.position
  if (data.username !== undefined) updateData.username = data.username
  if (data.signature_url !== undefined) updateData.signature_url = data.signature_url

  if (data.password) {
    const bcrypt = await import('bcryptjs')
    updateData.password_hash = await bcrypt.hash(data.password, 10)
  }

  updateData.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    console.error('Update profile error:', error)
    throw new Error(error.message || 'Failed to update profile')
  }

  revalidatePath('/profile')
  revalidatePath('/admin/users')
  return { success: true }
}

export async function unlinkMyLine() {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  // Safety check: ensure the user has credentials so they don't get locked out
  if (!user.username || !user.password_hash) {
    throw new Error('กรุณาตั้งค่า Username และรหัสผ่านก่อน เพื่อให้สามารถเข้าสู่ระบบผ่านช่องทางอื่นได้หลังจากยกเลิกการเชื่อมต่อ LINE')
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ line_uid: null })
    .eq('id', user.id)

  if (error) {
    console.error('Unlink LINE error:', error)
    throw new Error('ไม่สามารถยกเลิกการเชื่อมต่อ LINE ได้')
  }

  revalidatePath('/profile')
  return { success: true }
}
