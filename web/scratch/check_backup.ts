import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  const { data: files } = await supabase.storage.from('backups').list()
  if (!files || files.length === 0) {
    console.log("No backup files found.")
    return
  }
  
  // Sort by created_at desc
  files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  const latest = files[0]
  console.log("Latest backup:", latest.name)
  
  const { data: fileData, error } = await supabase.storage.from('backups').download(latest.name)
  if (error) {
    console.log("Download error:", error)
    return
  }
  
  const arrayBuffer = await fileData.arrayBuffer()
  const wb = XLSX.read(arrayBuffer, { type: 'buffer' })
  
  const sheetNames = wb.SheetNames
  console.log("Sheets:", sheetNames)
  
  if (sheetNames.includes('ot_documents')) {
    const ws = wb.Sheets['ot_documents']
    const rows = XLSX.utils.sheet_to_json(ws)
    console.log("ot_documents row count:", rows.length)
    if (rows.length > 0) {
      console.log("First row request_ids:", rows[0].request_ids)
    }
  } else {
    console.log("ot_documents sheet not found!")
  }
}

check()
