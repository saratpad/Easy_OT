import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase config missing for webhook')
      return NextResponse.json({ error: 'Config missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    console.log('\n--- รับ Webhook จาก LINE ---')

    if (body.events && body.events.length > 0) {
      for (const event of body.events) {
        if (!event.source) continue

        const type = event.source.type
        const groupId = event.source.groupId || event.source.roomId
        
        if (type === 'group') {
          console.log('✅ ได้รับ Group ID (กลุ่ม):', event.source.groupId)
        } else if (type === 'room') {
          console.log('✅ ได้รับ Room ID (ห้องแชท):', event.source.roomId)
        } else if (type === 'user') {
          console.log('👤 ได้รับ User ID (แชทส่วนตัว):', event.source.userId)
        }

        // Check for join event or command messages
        const isJoin = event.type === 'join'
        const isCommand = event.type === 'message' && 
                          event.message.type === 'text' && 
                          ['!id', '!group', '!groupid', 'groupid', 'id'].includes(event.message.text.trim().toLowerCase())

        if ((isJoin || isCommand) && groupId && event.replyToken) {
          const messageText = `สวัสดีครับ 🎉 ผมคือบอทแจ้งเตือนระบบ Easy OT\n\nGroup ID ของกลุ่มนี้คือ:\n${groupId}\n\nกรุณาคัดลอกไอดีด้านบนไปใส่ในช่อง LINE Target ID ในหน้าตั้งค่าระบบของท่านนะครับ`
          
          // Fetch all active tokens
          const { data: divisions } = await supabase
            .from('divisions')
            .select('line_channel_access_token')
            .not('line_channel_access_token', 'is', null)

          if (divisions && divisions.length > 0) {
            for (const div of divisions) {
              if (!div.line_channel_access_token) continue
              try {
                const res = await fetch('https://api.line.me/v2/bot/message/reply', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${div.line_channel_access_token}`
                  },
                  body: JSON.stringify({
                    replyToken: event.replyToken,
                    messages: [{ type: 'text', text: messageText }]
                  })
                })

                if (res.ok) {
                  console.log(`Successfully sent Group ID reply using token: ${div.line_channel_access_token.slice(0, 15)}...`)
                  break; // Stop after first successful reply
                } else {
                  console.warn(`Failed to reply with token: ${div.line_channel_access_token.slice(0, 15)}... Status: ${res.status}`)
                }
              } catch (replyErr) {
                console.error('Error sending reply:', replyErr)
              }
            }
          }
        }
      }
    } else {
      console.log('Received verification webhook from LINE')
    }
    
    console.log('-------------------------\n')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
