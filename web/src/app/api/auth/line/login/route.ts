import { NextResponse } from 'next/server'

export async function GET() {
  const lineChannelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/line/callback`
  
  if (!lineChannelId) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID is not configured' }, { status: 500 })
  }

  // Generate a random state string to prevent CSRF
  const state = crypto.randomUUID()
  
  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${lineChannelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`
  
  return NextResponse.redirect(authUrl)
}
