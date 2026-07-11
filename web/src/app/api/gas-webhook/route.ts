import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()
    const { documentId, documentUrl, url, driveFolderId, success } = body
    const finalUrl = documentUrl || url

    if (!documentId || !finalUrl || !success) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch the ot_document record
    const { data: otDocument, error: docError } = await supabase
      .from('ot_documents')
      .select('*, division:divisions(*)')
      .eq('id', documentId)
      .single()

    if (docError || !otDocument) {
      console.error('Error fetching ot_document:', docError)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 2. Update ot_documents
    await supabase
      .from('ot_documents')
      .update({ 
        document_url: finalUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    // 3. Update all related ot_requests
    if (otDocument.request_ids && otDocument.request_ids.length > 0) {
      await supabase
        .from('ot_requests')
        .update({ pdf_url: finalUrl })
        .in('id', otDocument.request_ids)
    }

    // 4. Update division's drive_folder_id if provided
    if (driveFolderId) {
      await supabase
        .from('divisions')
        .update({ drive_folder_id: driveFolderId })
        .eq('id', otDocument.division_id)
    }

    // 5. Send LINE Notification (if config exists and is enabled)
    const division = otDocument.division as any
    const isNotificationEnabled = division?.line_notifications_enabled !== false

    if (isNotificationEnabled && division?.line_channel_access_token && division?.line_target_id) {
      let message = ''
      if (otDocument.doc_type === 'attendance') {
        message = `📅 ออกตาราง/รายงานบัญชีลงเวลาปฏิบัติงาน OT สำเร็จ!\n`
          + `ประจำเดือน: ${otDocument.month_year}\n`
          + `\nกรุณาดาวน์โหลดหรือตรวจสอบเอกสารที่ลิงก์ด้านล่าง:\n${finalUrl}`
      } else {
        // Default to memo
        message = `📝 ออกบันทึกข้อความขออนุมัติปฏิบัติงาน OT สำเร็จ!\n`
          + (otDocument.doc_number ? `เลขที่: ${otDocument.doc_number} ` : '')
          + `วันที่สร้างเอกสาร ${otDocument.month_year}\n`
          + `\nกรุณาดาวน์โหลดหรือตรวจสอบเอกสารที่ลิงก์ด้านล่าง:\n${finalUrl}`
      }

      try {
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${division.line_channel_access_token}`,
          },
          body: JSON.stringify({
            to: division.line_target_id,
            messages: [{ type: 'text', text: message }],
          }),
        })

        // Update line_sent flag
        await supabase
          .from('ot_documents')
          .update({ line_sent: true })
          .eq('id', documentId)
      } catch (err) {
        console.error('Failed to send LINE notification:', err)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
