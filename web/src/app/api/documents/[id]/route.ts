import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verify user session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('easyot_session')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const gasWebhookUrl = process.env.GAS_WEBHOOK_URL

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuration missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the document to get the URL and request_ids
    const { data: docRecord, error: docErr } = await supabase
      .from('ot_documents')
      .select('document_url, request_ids')
      .eq('id', id)
      .single()

    if (docErr || !docRecord) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Try to delete file from Google Drive if URL exists
    if (docRecord.document_url && gasWebhookUrl) {
      const match = docRecord.document_url.match(/\/d\/([a-zA-Z0-9-_]+)\//)
      if (match && match[1]) {
        const fileId = match[1]
        try {
          console.log(`Sending delete request to GAS for fileId: ${fileId}`);
          const gasRes = await fetch(gasWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete_file',
              fileId
            }),
          })
          const gasText = await gasRes.text();
          console.log(`GAS Delete Response: status=${gasRes.status} body=${gasText}`);
        } catch (err) {
          console.error('Failed to call GAS delete webhook:', err)
          // Continue deleting from DB even if GAS fails
        }
      }
    }

    // Reset pdf_url in ot_requests so they appear as pending again
    if (docRecord.request_ids && docRecord.request_ids.length > 0) {
      await supabase
        .from('ot_requests')
        .update({ pdf_url: null })
        .in('id', docRecord.request_ids)
    }

    // Delete record from database
    const { error: deleteErr } = await supabase
      .from('ot_documents')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
    }

    revalidatePath('/admin/documents')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verify user session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('easyot_session')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuration missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { docNumber, createdAt } = body

    if (docNumber === undefined) {
      return NextResponse.json({ error: 'Missing docNumber' }, { status: 400 })
    }

    const updateData: any = { 
      doc_number: docNumber, 
      updated_at: new Date().toISOString() 
    }
    
    if (createdAt) {
      updateData.created_at = createdAt
    }

    // Update document record
    const { error: updateErr } = await supabase
      .from('ot_documents')
      .update(updateData)
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
    }

    revalidatePath('/admin/documents')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('PATCH /api/documents/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
