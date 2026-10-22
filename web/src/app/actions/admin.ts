'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getFiscalYearDateRange, getCurrentFiscalYear } from '@/utils/date'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Users Management ─────────────────────────────────────────────────────────

/** 
 * Fetch users — ถ้า divisionId ระบุมา จะกรองเฉพาะกองนั้น (สำหรับ sub_admin)
 */
export async function fetchAllUsers(divisionId?: string) {
  try {
    let query = supabaseAdmin
      .from('users')
      .select('*, division:divisions!users_division_id_fkey(id, name), group:groups!users_group_id_fkey(id, name)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (divisionId) {
      query = query.eq('division_id', divisionId)
    }

    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 5000)
    )
    const { data, error } = await Promise.race([query, timeoutPromise])
    if (error || !data) throw error || new Error('No data')
    return data
  } catch (err) {
    console.error('Fetch users error, using fallback:', err)
    return [
      { id: 'mock-super_admin', full_name: 'ผู้ดูแลระบบส่วนกลาง (Admin)', position: 'นักวิชาการคอมพิวเตอร์ชำนาญการพิเศษ', role: 'super_admin', username: 'admin', division: { name: 'กองประสานนโยบายและยุทธศาสตร์' }, group: { name: 'กลุ่มพัฒนาระบบเทคโนโลยีสารสนเทศ' } },
      { id: 'mock-director', full_name: 'นายสมศักดิ์ บริหารดี (ผอ.กอง)', position: 'ผู้อำนวยการกองประสานนโยบายและยุทธศาสตร์', role: 'director', username: 'director', division: { name: 'กองประสานนโยบายและยุทธศาสตร์' }, group: { name: 'ฝ่ายบริหารทั่วไป' } },
      { id: 'mock-supervisor', full_name: 'นางวิไล ผู้นำงาน (ผอ.กลุ่ม)', position: 'ผู้อำนวยการกลุ่มประสานนโยบายและยุทธศาสตร์ ๑', role: 'supervisor', username: 'supervisor', division: { name: 'กองประสานนโยบายและยุทธศาสตร์' }, group: { name: 'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑' } },
      { id: 'mock-employee', full_name: 'นายสมชาย มุ่งมั่น (เจ้าหน้าที่)', position: 'นักวิเคราะห์นโยบายและแผนปฏิบัติการ', role: 'employee', username: 'employee', division: { name: 'กองประสานนโยบายและยุทธศาสตร์' }, group: { name: 'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑' } }
    ]
  }
}

export async function updateUserRole(userId: string, role: string, divisionId: string) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ role, division_id: divisionId })
    .eq('id', userId)

  if (error) throw new Error('Failed to update user')
  revalidatePath('/admin')
  return { success: true }
}

// ─── Divisions & Groups Management ─────────────────────────────────────────────────────

// --- Groups Management ---
export async function fetchGroups(divisionId?: string) {
  try {
    let query = supabaseAdmin
      .from('groups')
      .select('*')
      .eq('is_deleted', false)
      .order('name')

    if (divisionId) {
      query = query.eq('division_id', divisionId)
    }

    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 5000)
    )
    const { data, error } = await Promise.race([query, timeoutPromise])
    if (error || !data) throw error || new Error('No data')
    return data
  } catch (err) {
    console.error('Fetch groups error, using fallback:', err)
    return [
      { id: 'grp-1', division_id: 'div-1', name: 'กลุ่มประสานนโยบายและยุทธศาสตร์ ๑' },
      { id: 'grp-2', division_id: 'div-1', name: 'กลุ่มพัฒนาระบบเทคโนโลยีสารสนเทศ' },
      { id: 'grp-3', division_id: 'div-1', name: 'ฝ่ายบริหารทั่วไป' }
    ]
  }
}

export async function createGroup(divisionId: string, name: string) {
  const { error } = await supabaseAdmin
    .from('groups')
    .insert({ division_id: divisionId, name })

  if (error) throw new Error('Failed to create group')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateGroup(id: string, name: string) {
  const { error } = await supabaseAdmin
    .from('groups')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error('Failed to update group')
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteGroup(id: string) {
  const { error } = await supabaseAdmin
    .from('groups')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error('Failed to delete group')
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Fetch divisions — ถ้า divisionId ระบุมา จะกรองเฉพาะกองนั้น (สำหรับ sub_admin)
 */
export async function fetchDivisions(divisionId?: string) {
  try {
    let query = supabaseAdmin
      .from('divisions')
      .select('*, executive:users!divisions_executive_id_fkey(id, full_name)')
      .eq('is_deleted', false)
      .order('name')

    if (divisionId) {
      query = query.eq('id', divisionId)
    }

    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 5000)
    )
    const { data, error } = await Promise.race([query, timeoutPromise])
    if (error || !data) throw error || new Error('No data')
    return data
  } catch (err) {
    console.error('Fetch divisions error, using fallback:', err)
    return [
      { id: 'div-1', name: 'กองประสานนโยบายและยุทธศาสตร์', doc_number_prefix: 'นร ๐๑๐๒' }
    ]
  }
}

export async function createDivision(name: string) {
  const { error } = await supabaseAdmin
    .from('divisions')
    .insert({ name })

  if (error) throw new Error('Failed to create division')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateDivision(id: string, data: {
  name?: string
  phone?: string
  recipient_name?: string
  doc_number_prefix?: string
}) {
  const { error } = await supabaseAdmin
    .from('divisions')
    .update(data)
    .eq('id', id)

  if (error) throw new Error('Failed to update division')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateDivisionExecutive(id: string, executiveId: string | null) {
  const { error } = await supabaseAdmin
    .from('divisions')
    .update({ executive_id: executiveId })
    .eq('id', id)

  if (error) throw new Error('Failed to update division executive')
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteDivision(id: string) {
  const { error } = await supabaseAdmin
    .from('divisions')
    .update({ is_deleted: true })
    .eq('id', id)

  if (error) throw new Error('Failed to delete division')
  revalidatePath('/admin')
  return { success: true }
}

export async function updateDivisionLineConfig(
  id: string,
  token: string,
  targetId: string,
  notificationsEnabled: boolean
) {
  const { error } = await supabaseAdmin
    .from('divisions')
    .update({
      line_channel_access_token: token,
      line_target_id: targetId,
      line_notifications_enabled: notificationsEnabled
    })
    .eq('id', id)

  if (error) throw new Error('Failed to update division LINE config')
  revalidatePath('/admin')
  return { success: true }
}

// ─── Approval Routes Management ───────────────────────────────────────────────

export async function fetchApprovalRoutes(divisionId: string) {
  const { data, error } = await supabaseAdmin
    .from('approval_routes')
    .select('*')
    .eq('division_id', divisionId)
    .order('step_order')

  if (error) throw new Error('Failed to fetch routes')
  return data
}

export async function updateApprovalRoutes(
  divisionId: string,
  routes: { step_order: number; target_role: string }[]
) {
  // ลบ routes เก่า
  const { error: delErr } = await supabaseAdmin
    .from('approval_routes')
    .delete()
    .eq('division_id', divisionId)

  if (delErr) {
    console.error('Delete routes error:', delErr)
    throw new Error('Failed to delete old routes')
  }

  // เพิ่ม routes ใหม่
  if (routes.length > 0) {
    const { error: insErr } = await supabaseAdmin
      .from('approval_routes')
      .insert(routes.map(r => ({ ...r, division_id: divisionId })))

    if (insErr) {
      console.error('Insert routes error:', insErr)
      throw new Error('Failed to update routes')
    }
  }

  revalidatePath('/admin')
  return { success: true }
}

// ─── OT Documents Management ──────────────────────────────────────────────────

export async function fetchApprovedRequests(divisionId: string, fiscalYear?: string) {
  let query = supabaseAdmin
    .from('ot_requests')
    .select('*, user:users(id, full_name, position)')
    .eq('division_id', divisionId)
    .eq('status', 'approved')
    .order('start_time', { ascending: true })

  if (fiscalYear) {
    query = query.eq('fiscal_year', fiscalYear)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch approved requests')

  // Fetch documents to exclude already generated ones
  const { data: docs } = await supabaseAdmin
    .from('ot_documents')
    .select('request_ids')
    .eq('division_id', divisionId)

  const generatedIds = new Set<string>()
  if (docs) {
    docs.forEach(d => {
      d.request_ids.forEach((id: string) => generatedIds.add(id))
    })
  }

  return data.filter(req => !generatedIds.has(req.id))
}

export async function createOTDocument(data: {
  divisionId: string
  fiscalYear: string
  monthYear: string
  docNumber: string
  requestIds: string[]
  format: 'pdf' | 'docx'
  docType?: 'memo' | 'attendance'
}) {
  // get session user for created_by
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const userId = cookieStore.get('easyot_session')?.value
  
  if (!userId) throw new Error('Unauthorized')

  const { data: doc, error } = await supabaseAdmin
    .from('ot_documents')
    .insert({
      division_id: data.divisionId,
      created_by: userId,
      fiscal_year: data.fiscalYear,
      month_year: data.monthYear,
      doc_number: data.docNumber,
      request_ids: data.requestIds,
      format: data.format,
      doc_type: data.docType || 'memo'
    })
    .select()
    .single()

  if (error) throw new Error('Failed to create document record')
  return doc
}

export async function updateDocumentUrl(documentId: string, documentUrl: string, driveFolderId?: string) {
  const updateData: any = { document_url: documentUrl, updated_at: new Date().toISOString() }

  const { error } = await supabaseAdmin
    .from('ot_documents')
    .update(updateData)
    .eq('id', documentId)

  if (error) throw new Error('Failed to update document URL')

  // อัพเดท drive_folder_id ใน divisions ถ้ามี
  if (driveFolderId) {
    const { data: doc } = await supabaseAdmin
      .from('ot_documents')
      .select('division_id')
      .eq('id', documentId)
      .single()

    if (doc?.division_id) {
      await supabaseAdmin
        .from('divisions')
        .update({ drive_folder_id: driveFolderId })
        .eq('id', doc.division_id)
    }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function fetchOTDocuments(divisionId?: string, monthQuery?: string) {
  let query = supabaseAdmin
    .from('ot_documents')
    .select('*, created_by_user:users!ot_documents_created_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (divisionId) {
    query = query.eq('division_id', divisionId)
  }

  if (monthQuery && monthQuery !== 'all') {
    if (monthQuery.startsWith('fy-')) {
      const fy = monthQuery.replace('fy-', '')
      const { startIso, endIso } = getFiscalYearDateRange(fy)
      query = query.gte('created_at', startIso).lt('created_at', endIso)
    } else {
      const year = parseInt(monthQuery.split('-')[0])
      const month = parseInt(monthQuery.split('-')[1])
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`
      
      query = query.gte('created_at', startDate).lt('created_at', endDate)
    }
  } else if (monthQuery === 'all') {
    // 5 years retention window
    const oldestFY = getCurrentFiscalYear() - 4
    const { startIso } = getFiscalYearDateRange(oldestFY)
    query = query.gte('created_at', startIso)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch documents')
  return data
}

// ─── System Settings Management ───────────────────────────────────────────────

export async function fetchSystemSettings(): Promise<Record<string, string>> {
  try {
    const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('Settings timeout')), 1500)
    )
    const queryPromise = supabaseAdmin.from('system_settings').select('key, value')
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

    if (error) {
      console.warn('Fetch settings error/timeout, using defaults')
      return {}
    }

    const settings: Record<string, string> = {}
    data?.forEach((row: any) => {
      settings[row.key] = row.value || ''
    })
    return settings
  } catch (err) {
    return {}
  }
}

export async function updateSystemSetting(key: string, value: string) {
  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) throw new Error('Failed to update setting')
  revalidatePath('/')
  return { success: true }
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

export async function createUser(data: {
  full_name: string
  position: string
  division_id: string
  group_id?: string
  role: string
  username?: string
  password?: string
  line_uid?: string
  signature_url?: string | null
  seniority_level?: number | null
}) {
  const insertData: any = {
    id: crypto.randomUUID(),
    full_name: data.full_name,
    position: data.position,
    division_id: data.division_id,
    group_id: data.group_id,
    role: data.role,
    line_uid: data.line_uid || `manual_${Date.now()}`,
    signature_url: data.signature_url || null,
    seniority_level: data.seniority_level !== undefined ? data.seniority_level : null,
  }

  if (data.username) {
    insertData.username = data.username
  }

  if (data.password) {
    const bcrypt = await import('bcryptjs')
    insertData.password_hash = await bcrypt.hash(data.password, 10)
  }

  const { error } = await supabaseAdmin.from('users').insert(insertData)
  if (error) {
    console.error('Create user error:', error)
    throw new Error(error.message || 'Failed to create user')
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateUser(userId: string, data: {
  full_name?: string
  position?: string
  division_id?: string
  group_id?: string
  role?: string
  username?: string
  password?: string
  signature_url?: string | null
  seniority_level?: number | null
}) {
  const updateData: any = {}
  if (data.full_name !== undefined) updateData.full_name = data.full_name
  if (data.position !== undefined) updateData.position = data.position
  if (data.division_id !== undefined) updateData.division_id = data.division_id
  if (data.group_id !== undefined) updateData.group_id = data.group_id
  if (data.role !== undefined) updateData.role = data.role
  if (data.username !== undefined) updateData.username = data.username
  if (data.signature_url !== undefined) updateData.signature_url = data.signature_url
  if (data.seniority_level !== undefined) updateData.seniority_level = data.seniority_level

  if (data.password) {
    const bcrypt = await import('bcryptjs')
    updateData.password_hash = await bcrypt.hash(data.password, 10)
  }

  updateData.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin.from('users').update(updateData).eq('id', userId)
  if (error) {
    console.error('Update user error:', error)
    throw new Error(error.message || 'Failed to update user')
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw new Error('Failed to delete user')
  revalidatePath('/admin/users')
  return { success: true }
}

export async function importUsers(users: {
  full_name: string
  position: string
  division_name: string
  group_name?: string
  role: string
  username?: string
  password?: string
}[]) {
  // Fetch division mapping
  const { data: divisions } = await supabaseAdmin
    .from('divisions')
    .select('id, name')
    .eq('is_deleted', false)

  const divMap = new Map<string, string>()
  divisions?.forEach(d => divMap.set(d.name.trim(), d.id))

  // Fetch group mapping
  const { data: groups } = await supabaseAdmin
    .from('groups')
    .select('id, name, division_id')
    .eq('is_deleted', false)
    
  const groupMap = new Map<string, string>()
  groups?.forEach(g => groupMap.set(`${g.division_id}_${g.name.trim()}`, g.id))

  const bcrypt = await import('bcryptjs')
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const u of users) {
    const divisionId = divMap.get(u.division_name.trim())
    if (!divisionId) {
      errors.push(`ไม่พบกอง "${u.division_name}" สำหรับ ${u.full_name}`)
      skipped++
      continue
    }

    let groupId = null
    if (u.group_name && u.group_name.trim() !== '') {
      groupId = groupMap.get(`${divisionId}_${u.group_name.trim()}`)
      // ถ้ามีชื่อกลุ่มแต่หากลุ่มใน DB ไม่เจอ อาจจะเก็บ error หรือข้ามก็ได้ ในที่นี้ยอมให้เป็น null หรือควรเตือน?
      // เลือกให้เตือนแล้วข้ามไปดีกว่าเพื่อความปลอดภัย หรืออาจจะไม่ใส่กลุ่ม
      if (!groupId) {
        errors.push(`ไม่พบกลุ่ม "${u.group_name}" ในกอง "${u.division_name}" สำหรับ ${u.full_name}`)
        skipped++
        continue
      }
    }

    const insertData: any = {
      id: crypto.randomUUID(),
      full_name: u.full_name.trim(),
      position: u.position.trim(),
      division_id: divisionId,
      group_id: groupId,
      role: u.role || 'employee',
      line_uid: `import_${Date.now()}_${imported}`,
    }

    if (u.username) insertData.username = u.username.trim()
    if (u.password) insertData.password_hash = await bcrypt.hash(u.password.trim(), 10)

    const { error } = await supabaseAdmin.from('users').insert(insertData)
    if (error) {
      errors.push(`${u.full_name}: ${error.message}`)
      skipped++
    } else {
      imported++
    }
  }

  revalidatePath('/admin/users')
  return { imported, skipped, errors }
}

export async function exportUsers(divisionId?: string) {
  let query = supabaseAdmin
    .from('users')
    .select('full_name, position, role, username, division:divisions!users_division_id_fkey(name), group:groups!users_group_id_fkey(name)')
    .eq('is_deleted', false)
    .order('full_name')

  if (divisionId) {
    query = query.eq('division_id', divisionId)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to export users')
  return data
}
