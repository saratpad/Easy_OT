'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET_NAME = 'backups'

// Tables to backup, ordered by insertion dependency (least dependent first)
const TABLES = [
  'system_settings',
  'holidays',
  'divisions',
  'groups',
  'users',
  'approval_routes',
  'ot_requests',
  'ot_request_approvals',
  'ot_documents'
]

// ─── Bucket Initialization ──────────────────────────────────────────────────
async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET_NAME)) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: false,
    })
  }
}

// ─── List Backups ───────────────────────────────────────────────────────────
export async function listBackups() {
  await ensureBucket()
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).list()
  if (error) {
    console.error('List backups error:', error)
    return []
  }
  return data?.filter(f => f.name.endsWith('.xlsx')) || []
}

// ─── Create Backup (Export) ──────────────────────────────────────────────────
export async function createBackup(filenamePrefix = 'backup') {
  await ensureBucket()
  
  const wb = XLSX.utils.book_new()
  
  for (const table of TABLES) {
    const { data, error } = await supabaseAdmin.from(table).select('*')
    if (error) {
      console.error(`Error fetching table ${table}:`, error)
      throw new Error(`Failed to fetch table ${table} for backup: ${error.message}`)
    }
    
    const processedData = (data || []).map(row => {
      const newRow = { ...row }
      for (const key in newRow) {
        if (Array.isArray(newRow[key])) {
          newRow[key] = newRow[key].join(',')
        }
      }
      return newRow
    })
    
    const ws = XLSX.utils.json_to_sheet(processedData)
    XLSX.utils.book_append_sheet(wb, ws, table.substring(0, 31)) // Sheet name max 31 chars
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  
  // Format Date for filename
  const now = new Date()
  // Add 7 hours for UTC+7 (Thailand)
  const localDate = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const dateStr = localDate.toISOString().replace(/[:.]/g, '-').split('T')[0]
  const timeStr = localDate.toISOString().replace(/[:.]/g, '-').split('T')[1].substring(0, 8)
  const filename = `${filenamePrefix}_${dateStr}_${timeStr}.xlsx`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to upload backup: ${uploadError.message}`)
  }
  
  return { success: true, filename }
}

// ─── Generate Export Data URL (For manual export without saving to bucket) ──
export async function exportDatabaseToDataURL() {
  const wb = XLSX.utils.book_new()
  
  for (const table of TABLES) {
    const { data, error } = await supabaseAdmin.from(table).select('*')
    if (error) {
      console.error(`Error fetching table ${table}:`, error)
      continue
    }
    const processedData = (data || []).map(row => {
      const newRow = { ...row }
      for (const key in newRow) {
        if (Array.isArray(newRow[key])) {
          newRow[key] = newRow[key].join(',')
        }
      }
      return newRow
    })

    const ws = XLSX.utils.json_to_sheet(processedData)
    XLSX.utils.book_append_sheet(wb, ws, table.substring(0, 31))
  }

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`
}

// ─── Delete Backup ─────────────────────────────────────────────────────────
export async function deleteBackup(filename: string) {
  const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([filename])
  if (error) throw new Error('Failed to delete backup')
  return { success: true }
}

// ─── Get Backup URL ────────────────────────────────────────────────────────
export async function getBackupUrl(filename: string) {
  // Use createSignedUrl for private buckets
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filename, 60 * 60) // valid for 1 hour

  if (error) throw new Error('Failed to get download link')
  return data.signedUrl
}

// ─── Clear Data ────────────────────────────────────────────────────────────
export async function clearData(options: {
  clearUsers: boolean
  clearRequests: boolean
  clearDivisions: boolean
  clearSettings: boolean
}) {
  const { clearUsers, clearRequests, clearDivisions, clearSettings } = options

  // 1. Clear Requests
  if (clearRequests) {
    const { error: e1 } = await supabaseAdmin.from('ot_documents').delete().not('id', 'is', null)
    if (e1) throw new Error(`Clear documents error: ${e1.message}`)
    
    const { error: e2 } = await supabaseAdmin.from('ot_request_approvals').delete().not('id', 'is', null)
    if (e2) throw new Error(`Clear approvals error: ${e2.message}`)
    
    const { error: e3 } = await supabaseAdmin.from('ot_requests').delete().not('id', 'is', null)
    if (e3) throw new Error(`Clear requests error: ${e3.message}`)
  }

  // 2. Clear Users (Exclude super_admin)
  if (clearUsers) {
    // Unlink super_admin from divisions/groups to prevent foreign key errors
    await supabaseAdmin.from('users').update({ division_id: null, group_id: null }).eq('role', 'super_admin')
    
    // Note: It's safer to delete specific roles or preserve super_admins.
    const { error } = await supabaseAdmin.from('users').delete().neq('role', 'super_admin')
    if (error) console.error('Clear users error:', error)
  }

  // 3. Clear Divisions & Groups
  if (clearDivisions) {
    if (!clearUsers) {
      await supabaseAdmin.from('users').update({ division_id: null, group_id: null }).eq('role', 'super_admin')
    }
    await supabaseAdmin.from('approval_routes').delete().not('id', 'is', null)
    await supabaseAdmin.from('groups').delete().not('id', 'is', null)
    await supabaseAdmin.from('divisions').delete().not('id', 'is', null)
  }

  // 4. Clear Settings & Holidays
  if (clearSettings) {
    await supabaseAdmin.from('holidays').delete().not('id', 'is', null)
    // Maybe don't delete system settings entirely to avoid breaking UI, or just clear them
    // await supabaseAdmin.from('system_settings').delete().not('id', 'is', null)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function annualCutoff() {
  // 1. Create a specific backup
  await createBackup('Annual_Cutoff')

  // 2. Archive and Clear Google Drive Folders via GAS
  let zipUrl = ''
  let zipFileId = ''
  const gasWebhookUrl = process.env.GAS_WEBHOOK_URL
  if (gasWebhookUrl) {
    try {
      const gasResponse = await fetch(gasWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_folders' }),
      })
      if (gasResponse.ok) {
        const gasResult = await gasResponse.json()
        if (!gasResult.success) {
          throw new Error(gasResult.error || 'Failed to archive folders in Google Drive')
        }
        if (gasResult.url) {
          zipUrl = gasResult.url
          zipFileId = gasResult.fileId || ''
        }
      } else {
        throw new Error('GAS Webhook returned ' + gasResponse.status)
      }
    } catch (e: any) {
      console.error('GAS Archive Error:', e)
      throw new Error(`การแบ็คอัพไฟล์บน Google Drive ล้มเหลว: ${e.message}`)
    }
  }

  // 3. Delete all requests from Database
  await clearData({
    clearUsers: false,
    clearRequests: true,
    clearDivisions: false,
    clearSettings: false
  })

  revalidatePath('/', 'layout')
  return { success: true, zipUrl, zipFileId }
}

export async function deleteDriveFile(fileId: string) {
  const gasWebhookUrl = process.env.GAS_WEBHOOK_URL
  if (!gasWebhookUrl) throw new Error('No GAS_WEBHOOK_URL configured')
  
  const res = await fetch(gasWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_file', fileId }),
  })
  
  if (!res.ok) throw new Error('Failed to delete file from Google Drive')
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete file')
  return { success: true }
}

// ─── Restore Database ────────────────────────────────────────────────────────
export async function restoreDatabase(filename: string) {
  // 1. Download file from bucket
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .download(filename)
    
  if (downloadError || !fileData) {
    throw new Error('Failed to download backup file')
  }

  const arrayBuffer = await fileData.arrayBuffer()
  const wb = XLSX.read(arrayBuffer, { type: 'buffer' })

  // 2. Clear everything first
  await clearData({
    clearUsers: true,
    clearRequests: true,
    clearDivisions: true,
    clearSettings: true
  })

  // 3. Insert data from sheets in dependency order
  for (const table of TABLES) {
    const sheetName = table.substring(0, 31)
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    
    const rows = XLSX.utils.sheet_to_json(ws)
    if (rows.length === 0) continue

    // Delete existing data just to be absolutely sure (already done in clearData, but safe)
    if (table !== 'users') {
       await supabaseAdmin.from(table).delete().not('id', 'is', null)
    }

    // Process chunk inserts for large tables
    const CHUNK_SIZE = 500
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      let chunk = rows.slice(i, i + CHUNK_SIZE)
      
      // Fix Array columns before inserting
      chunk = chunk.map((r: any) => {
        const newR = { ...r }
        
        // ot_documents request_ids
        if (table === 'ot_documents') {
          if (typeof newR.request_ids === 'string') {
            newR.request_ids = newR.request_ids ? newR.request_ids.split(',') : []
          }
        }
        
        // Break circular dependencies for divisions and groups
        if (table === 'divisions') {
          if ('executive_id' in newR) newR.executive_id = null
          if ('executive_ids' in newR) newR.executive_ids = null
        }
        if (table === 'groups') {
          if ('leader_id' in newR) newR.leader_id = null
        }
        
        return newR
      })

      const { error } = await supabaseAdmin.from(table).upsert(chunk)
      if (error) {
        console.error(`Restore error on table ${table}:`, error)
        throw new Error(`Restore failed on table ${table}: ${error.message}`)
      }
    }
  }

  // 4. Pass 2: Restore full records for divisions and groups to fix circular dependencies
  for (const table of ['divisions', 'groups']) {
    const sheetName = table.substring(0, 31)
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    
    const rows = XLSX.utils.sheet_to_json(ws)
    if (rows.length === 0) continue

    const CHUNK_SIZE = 500
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      let chunk = rows.slice(i, i + CHUNK_SIZE)
      
      // Fix Array columns for divisions
      if (table === 'divisions') {
        chunk = chunk.map((r: any) => {
          const newR = { ...r }
          if (typeof newR.executive_ids === 'string') {
            newR.executive_ids = newR.executive_ids ? newR.executive_ids.split(',') : []
          }
          return newR
        })
      }

      const { error } = await supabaseAdmin.from(table).upsert(chunk)
      if (error) console.error(`Restore pass 2 error on table ${table}:`, error)
    }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// ─── Import Database from Base64 ─────────────────────────────────────────────
export async function importDatabaseFromBase64(base64Str: string) {
  // Remove data URL prefix if present
  const base64Data = base64Str.split(',')[1] || base64Str
  const buffer = Buffer.from(base64Data, 'base64')
  const wb = XLSX.read(buffer, { type: 'buffer' })

  // 1. Clear everything first
  await clearData({
    clearUsers: true,
    clearRequests: true,
    clearDivisions: true,
    clearSettings: true
  })

  // 2. Insert data from sheets in dependency order
  for (const table of TABLES) {
    const sheetName = table.substring(0, 31)
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    
    const rows = XLSX.utils.sheet_to_json(ws)
    if (rows.length === 0) continue

    if (table !== 'users') {
       await supabaseAdmin.from(table).delete().not('id', 'is', null)
    }

    const CHUNK_SIZE = 500
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      let chunk = rows.slice(i, i + CHUNK_SIZE)
      
      // Pass 1: Break circular dependencies for divisions and groups
      if (table === 'divisions') {
        chunk = chunk.map((r: any) => {
          const newR = { ...r }
          if ('executive_id' in newR) newR.executive_id = null
          if ('executive_ids' in newR) newR.executive_ids = null
          return newR
        })
      }
      if (table === 'groups') {
        chunk = chunk.map((r: any) => {
          const newR = { ...r }
          if ('leader_id' in newR) newR.leader_id = null
          return newR
        })
      }

      const { error } = await supabaseAdmin.from(table).upsert(chunk)
      if (error) {
        console.error(`Restore error on table ${table}:`, error)
        throw new Error(`Restore failed on table ${table}: ${error.message}`)
      }
    }
  }

  // 4. Pass 2: Restore full records for divisions and groups to fix circular dependencies
  for (const table of ['divisions', 'groups']) {
    const sheetName = table.substring(0, 31)
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    
    const rows = XLSX.utils.sheet_to_json(ws)
    if (rows.length === 0) continue

    const CHUNK_SIZE = 500
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const { error } = await supabaseAdmin.from(table).upsert(chunk)
      if (error) console.error(`Restore pass 2 error on table ${table}:`, error)
    }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
