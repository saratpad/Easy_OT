import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const thMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const thMonthsShort = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

function getThaiDate(dateString?: string) {
  const d = dateString ? new Date(dateString) : new Date()
  return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const gasWebhookUrl = process.env.GAS_WEBHOOK_URL

    if (!supabaseUrl || !supabaseServiceKey || !gasWebhookUrl) {
      return NextResponse.json({ error: 'Configuration is missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { documentId, executiveId, format } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
    }

    // 1. Fetch document record
    const { data: docRecord, error: docErr } = await supabase
      .from('ot_documents')
      .select('*, division:divisions(*)')
      .eq('id', documentId)
      .single()

    if (docErr || !docRecord) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const division = docRecord.division as any

    // 1.5 Delete old file from Drive if it exists (Reprint case)
    if (docRecord.document_url && gasWebhookUrl) {
      const match = docRecord.document_url.match(/\/d\/([a-zA-Z0-9-_]+)\//)
      if (match && match[1]) {
        const oldFileId = match[1]
        try {
          await fetch(gasWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_file', fileId: oldFileId }),
          })
        } catch (e) {
          console.error('Failed to delete old file:', e)
        }
      }
    }

    // 2. Fetch OT requests
    const { data: otRequests, error: reqErr } = await supabase
      .from('ot_requests')
      .select('*, user:users(full_name, position)')
      .in('id', docRecord.request_ids)
      .order('start_time', { ascending: true })

    if (reqErr || !otRequests) {
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // 3. Fetch Holidays to determine Workdays vs Holidays
    const { data: holidaysData } = await supabase.from('holidays').select('date')
    const holidayDates = new Set((holidaysData || []).map(h => h.date))

    // 4. Group requests into Workdays and Holidays
    const workdays: any[] = []
    const holidaysReq: any[] = []

    otRequests.forEach(req => {
      const start = new Date(req.start_time)
      const yyyyMmDd = req.start_time.split('T')[0]
      const isWeekend = start.getDay() === 0 || start.getDay() === 6
      if (isWeekend || holidayDates.has(yyyyMmDd)) {
        holidaysReq.push(req)
      } else {
        workdays.push(req)
      }
    })

    // --- Helper: สร้าง date string สำหรับแต่ละกลุ่ม ---
    const buildDateStr = (requests: any[], typeLabel: string): string => {
      if (requests.length === 0) return ''
      const dates = Array.from(new Set(requests.map(r => new Date(r.start_time).getDate()))).sort((a, b) => a - b)
      const sampleDate = new Date(requests[0].start_time)
      const monthYear = `${thMonthsShort[sampleDate.getMonth()]} ${sampleDate.getFullYear() + 543}`
      return `${typeLabel}\n${dates.join(', ')} ${monthYear}`
    }

    // --- ฟังก์ชันแปลงตัวเลขอารบิกเป็นตัวเลขไทย ---
    const toThaiNum = (num: number): string => {
      const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']
      return num.toString().split('').map(d => thaiDigits[parseInt(d, 10)]).join('')
    }

    // --- รวบรวมรายชื่อผู้ปฏิบัติงานทั้งหมดจากทุก Requests (รวมทั้งวันทำการและวันหยุด ไม่ซ้ำคน) ---
    const SEP = '\n---------------------------------------------------------\n'
    const uniquePeopleMap = new Map<string, { name: string; position: string }>()
    otRequests.forEach(r => {
      if (r.user && !uniquePeopleMap.has(r.user_id)) {
        uniquePeopleMap.set(r.user_id, { name: r.user.full_name, position: r.user.position })
      }
    })

    const namesList: string[] = []
    let idx = 1
    for (const p of uniquePeopleMap.values()) {
      const prefix = uniquePeopleMap.size > 1 ? `${toThaiNum(idx)}) ` : ''
      namesList.push(`${prefix}${p.name}\n${p.position}`)
      idx++
    }
    const namePosCol = namesList.join(SEP)

    // --- รวบรวมภารกิจทั้งหมด (dedup) จากทุก request ---
    const allSeenTasks = new Map<string, string>()
    otRequests.forEach(r => {
      if (r.reason) {
        const t = r.reason.trim()
        const key = t.toLowerCase().replace(/\s+/g, ' ')
        if (!allSeenTasks.has(key)) allSeenTasks.set(key, t)
      }
    })
    const combinedTaskCol = [
      ...Array.from(allSeenTasks.values()).map(t => `- ${t}`),
      '- ภารกิจอื่นที่ได้รับมอบหมาย'
    ].join('\n')

    // --- สร้าง dateCol โดยคั่นด้วยเว้นบรรทัดหนึ่งครั้ง (\n) เพื่อให้ชิดขึ้น ---
    const dateParts: string[] = []
    if (workdays.length > 0) {
      dateParts.push(buildDateStr(workdays, 'วันทำการ'))
    }
    if (holidaysReq.length > 0) {
      dateParts.push(buildDateStr(holidaysReq, 'วันหยุดราชการ'))
    }

    // ตารางมีแค่ 1 แถ
    const employees: any[] = [{
      date: dateParts.join('\n').trim(),
      namePos: namePosCol.trim(),
      task: combinedTaskCol.trim()
    }]

    // 4. Fetch Commander (Director) and Executive
    // - Commander is the Director of the division
    const { data: commander } = await supabase
      .from('users')
      .select('*')
      .eq('division_id', division.id)
      .eq('role', 'director')
      .eq('is_deleted', false)
      .single()

    // - Executive is selected in the UI
    let executive = null
    let executiveApprovedDate = ''
    if (executiveId) {
      const { data: execData } = await supabase
        .from('users')
        .select('*')
        .eq('id', executiveId)
        .single()
      executive = execData

      // Get the latest approval date by this executive for these requests
      const { data: approvals } = await supabase
        .from('ot_request_approvals')
        .select('acted_at')
        .in('request_id', docRecord.request_ids)
        .eq('approver_id', executiveId)
        .order('acted_at', { ascending: false })
        .limit(1)

      if (approvals && approvals.length > 0) {
        const ad = new Date(approvals[0].acted_at)
        executiveApprovedDate = `${ad.getDate()} ${thMonths[ad.getMonth()]} ${ad.getFullYear() + 543}`
      }
    }

    // Prepare payload for GAS
    const finalFormat = format || docRecord.format;
    const payload = {
      documentId: docRecord.id,
      requestIds: docRecord.request_ids,
      format: finalFormat,
      employees,

      divisionName: division.name,
      divisionFolderId: division.drive_folder_id,
      fiscalYear: docRecord.fiscal_year,
      monthYear: docRecord.month_year,
      docNumber: docRecord.doc_number || '',
      buddhistYear: (new Date(docRecord.created_at).getFullYear() + 543).toString(),
      thaiDate: getThaiDate(docRecord.created_at),
      recipientName: division.recipient_name || 'เลขาธิการนายกรัฐมนตรี',
      phone: division.phone || '',

      commanderName: commander?.full_name || '',
      commanderPosition: commander?.position || '',
      commanderSignatureUrl: commander?.signature_url || '',

      executiveName: executive?.full_name || '',
      executivePosition: executive?.position || '',
      executiveSignatureUrl: executive?.signature_url || '',
      executiveApprovedDate,

      callbackUrl: `${(process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000').trim()}/api/gas-webhook`
    }

    // 5. POST to GAS Webhook
    const gasResponse = await fetch(gasWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!gasResponse.ok) {
      console.error('GAS Webhook failed:', await gasResponse.text())
      return NextResponse.json({ error: 'Failed to trigger document generation in GAS' }, { status: 500 })
    }

    const gasResult = await gasResponse.json()
    console.log('GAS Result:', gasResult)

    // In local development, the GAS callback might not reach localhost.
    // Since GAS returns the URL synchronously, we can update it here directly as a fallback.
    if (gasResult.success && gasResult.url) {
      await supabase
        .from('ot_documents')
        .update({
          document_url: gasResult.url,
          format: finalFormat,
          updated_at: new Date().toISOString()
        })
        .eq('id', docRecord.id)

      if (docRecord.request_ids && docRecord.request_ids.length > 0) {
        await supabase
          .from('ot_requests')
          .update({ pdf_url: gasResult.url })
          .in('id', docRecord.request_ids)
      }
    }

    return NextResponse.json({ success: true, message: 'Document generation triggered successfully', url: gasResult.url })

  } catch (error: any) {
    console.error('Generate document error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
