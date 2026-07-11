import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Fetch system settings
    const { data: settings } = await supabaseAdmin.from('system_settings').select('setting_key, setting_value')
    const settingsMap: Record<string, string> = {}
    if (settings) {
      settings.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value
      })
    }
    
    const logoUrl = settingsMap['logo_url']
    if (logoUrl) {
      const res = await fetch(logoUrl)
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=3600, must-revalidate',
          }
        })
      }
    }

    // Fallback: Return a simple transparent pixel if no logo or fetch fails
    const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
    return new NextResponse(transparentPixel, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      }
    })
  } catch (err) {
    console.error('Error serving icon:', err)
    return new NextResponse('Error', { status: 500 })
  }
}
