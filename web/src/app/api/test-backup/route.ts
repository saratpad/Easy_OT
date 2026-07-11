import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: files } = await supabase.storage.from('backups').list()
  if (!files || files.length === 0) return NextResponse.json({ error: 'no files' })
  
  files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const latest = files.find(f => f.name.endsWith('.xlsx'))
  if (!latest) return NextResponse.json({ error: 'no xlsx' })
  
  const { data: fileData, error } = await supabase.storage.from('backups').download(latest.name)
  if (error) return NextResponse.json({ error })
  
  const buffer = await fileData.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'buffer' })
  
  const ws = wb.Sheets['ot_documents']
  if (!ws) return NextResponse.json({ error: 'no ot_documents sheet' })
  
  const rows = XLSX.utils.sheet_to_json(ws)
  return NextResponse.json({ count: rows.length, firstRow: rows[0] })
}
