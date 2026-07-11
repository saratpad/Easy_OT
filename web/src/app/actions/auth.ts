'use server'

import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SESSION_COOKIE_NAME = 'easyot_session'

// ─── Role helpers ─────────────────────────────────────────────────────────────
const ADMIN_ROLES: UserRole[] = ['super_admin', 'sub_admin']
const APPROVER_ROLES: UserRole[] = ['supervisor', 'director', 'executive', 'super_admin', 'sub_admin']

function getRedirectPath(role: UserRole): string {
  if (ADMIN_ROLES.includes(role)) return '/admin'
  if (APPROVER_ROLES.includes(role)) return '/approver'
  return '/employee'
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginWithLine(lineUid: string) {
  if (!lineUid) throw new Error('LINE UID is required')

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('line_uid', lineUid)
    .eq('is_deleted', false)
    .single()

  if (error || !user) {
    return { registered: false }
  }

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return {
    registered: true,
    role: user.role as UserRole,
    redirectTo: getRedirectPath(user.role as UserRole),
  }
}

export async function loginWithPassword(username: string, password: string) {
  if (!username || !password) throw new Error('Username and Password are required')

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('is_deleted', false)
    .single()

  if (error || !user || !user.password_hash) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  }

  // verify password
  const bcrypt = await import('bcryptjs')
  const isValid = await bcrypt.compare(password, user.password_hash)
  
  if (!isValid) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  }

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return {
    success: true,
    role: user.role as UserRole,
    redirectTo: getRedirectPath(user.role as UserRole),
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerWithLine(data: {
  line_uid: string
  full_name: string
  position: string
  division_id: string
  group_id?: string
}) {
  const { line_uid, full_name, position, division_id, group_id } = data

  if (!line_uid || !full_name || !position || !division_id) {
    throw new Error('All fields are required')
  }

  // Free up line_uid from any deleted accounts to prevent unique constraint violation
  await supabaseAdmin
    .from('users')
    .update({ line_uid: null })
    .eq('line_uid', line_uid)
    .eq('is_deleted', true)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: crypto.randomUUID(),
      line_uid,
      full_name,
      position,
      division_id,
      group_id: group_id || null,
      role: 'employee' as UserRole,
    })
    .select()
    .single()

  if (error) {
    console.error('Registration error:', error)
    throw new Error('Failed to register user')
  }

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return { success: true, role: user.role as UserRole, redirectTo: '/employee' }
}

// ─── Link to Existing Account ─────────────────────────────────────────────────
export async function linkLineToExistingAccount(data: {
  username: string
  password_text: string
  lineUid: string
}) {
  const { username, password_text, lineUid } = data

  if (!username || !password_text || !lineUid) {
    throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
  }

  // 1. Fetch user by username
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('is_deleted', false)
    .single()

  if (error || !user || !user.password_hash) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  }

  // 2. Verify password
  const bcrypt = await import('bcryptjs')
  const isValid = await bcrypt.compare(password_text, user.password_hash)
  if (!isValid) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  }

  // Check if this user already has a line_uid linked
  if (user.line_uid && user.line_uid !== lineUid) {
    throw new Error('บัญชีนี้ถูกเชื่อมต่อกับ LINE อื่นไปแล้ว')
  }

  // Free up line_uid from any deleted accounts to prevent unique constraint violation
  await supabaseAdmin
    .from('users')
    .update({ line_uid: null })
    .eq('line_uid', lineUid)
    .eq('is_deleted', true)

  // 3. Update line_uid
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ line_uid: lineUid })
    .eq('id', user.id)

  if (updateError) {
    console.error('Failed to link LINE account:', updateError)
    throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อบัญชี')
  }

  // 4. Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return {
    success: true,
    role: user.role as UserRole,
    redirectTo: getRedirectPath(user.role as UserRole),
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// ─── Get session user ─────────────────────────────────────────────────────────
export async function getSessionUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!userId) return null

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*, division:divisions!users_division_id_fkey(id, name, line_channel_access_token, line_target_id, drive_folder_id, doc_number_prefix, recipient_name, line_notifications_enabled), group:groups!users_group_id_fkey(id, name)')
    .eq('id', userId)
    .eq('is_deleted', false)
    .single()

  return user || null
}
