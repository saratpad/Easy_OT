import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const thMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

function getThaiDateForTable(dateString: string) {
  const d = new Date(dateString)
  return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`
}

function getThaiMonthYear(yyyyMm: string) {
  if (!yyyyMm) return ''
  const [year, month] = yyyyMm.split('-')
  const thMonth = thMonths[parseInt(month, 10) - 1]
  const thYear = parseInt(year, 10) + 543
  return `${thMonth} ${thYear}`
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
    const { documentId, divisionId, month, format } = body // month format 'yyyy-MM'

    if (!documentId || !divisionId || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch document record (for history tracking)
    const { data: docRecord, error: docErr } = await supabase
      .from('ot_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docErr || !docRecord) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 2. Fetch division
    const { data: division, error: divErr } = await supabase
      .from('divisions')
      .select('name, drive_folder_id')
      .eq('id', divisionId)
      .single()

    if (divErr || !division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    // 2.5 Delete old file from Drive if it exists (Reprint case)
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

    // 3. Build start and end dates for the month
    const [year, m] = month.split('-')
    const startDate = new Date(parseInt(year), parseInt(m) - 1, 1).toISOString()
    const endDate = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59).toISOString()

    // 4. Fetch OT requests for this division and month
    const { data: otRequests, error: reqErr } = await supabase
      .from('ot_requests')
      .select('*, user:users(full_name, division_id)')
      .eq('status', 'approved')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true })

    if (reqErr) {
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    const divisionRequests = otRequests?.filter(req => req.user?.division_id === divisionId) || []
    if (divisionRequests.length === 0) {
      return NextResponse.json({ error: 'No approved requests found for this month' }, { status: 404 })
    }

    // 5. Map to GAS format
    const employees: any[] = []
    const remarks: string[] = []

    divisionRequests.forEach((req, index) => {
      const extractTime = (dateStr: string | null) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
      }

      const reqTimeStart = new Date(req.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
      const reqTimeEnd = new Date(req.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
      const requestedTime = `${reqTimeStart} - ${reqTimeEnd} น.`
      
      if (req.certification_step === -1) {
        const dateStr = getThaiDateForTable(req.start_time)
        const rejectNote = (req.certification_note || 'ไม่ระบุ').replace(/\n/g, ' ')
        remarks.push(`- วันที่ ${dateStr} เวลา ${requestedTime} ${req.user?.full_name} (เรื่อง: ${req.reason}) -> สถานะ: ถูกปฏิเสธการรับรอง (${rejectNote})`)
      } else if (req.is_worked === false) {
        const dateStr = getThaiDateForTable(req.start_time)
        remarks.push(`- วันที่ ${dateStr} เวลา ${requestedTime} ${req.user?.full_name} (เรื่อง: ${req.reason}) -> สถานะ: ไม่ได้ปฏิบัติงานจริง (0 ชั่วโมง)`)
      } else {
        // Normal employee row
        const sTime = req.actual_start_time || req.start_time
        const eTime = req.actual_end_time || req.end_time
        
        employees.push({
          date: getThaiDateForTable(sTime),
          sequence: String(employees.length + 1),
          fullName: req.user?.full_name || 'ไม่ทราบชื่อ',
          reason: req.reason || 'ปฏิบัติงานล่วงเวลา',
          timeIn: extractTime(sTime),
          timeOut: extractTime(eTime)
        })
      }
    })

    const payload = {
      action: 'generate_attendance_report',
      templateId: '1ibjusPqv0CGKDIwkZodwyWuOWPwY0R-FihNh9WTv2nM',
      divisionName: division.name,
      divisionFolderId: division.drive_folder_id,
      fiscalYear: docRecord.fiscal_year,
      monthYear: getThaiMonthYear(month),
      format: format || 'pdf',
      employees: employees,
      remarks: remarks,
      documentId: documentId,
      callbackUrl: `${request.headers.get('origin')}/api/gas-webhook`
    }

    // 6. Send to GAS
    const res = await fetch(gasWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('GAS Error:', errorText)
      return NextResponse.json({ error: 'Failed to generate document via GAS' }, { status: 500 })
    }

    const gasResponse = await res.json()
    if (!gasResponse.success) {
      console.error('GAS Logic Error:', gasResponse.error)
      return NextResponse.json({ error: gasResponse.error || 'GAS Logic Error' }, { status: 500 })
    }

    // 7. Update document URL locally (as fallback if webhook fails)
    if (gasResponse.url) {
      await supabase
        .from('ot_documents')
        .update({
          document_url: gasResponse.url,
          format: format || 'pdf',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
    }

    return NextResponse.json({ success: true, url: gasResponse.url })
  } catch (error: any) {
    console.error('Error generating attendance report:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
