import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { loginWithLine } from '@/app/actions/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/login?error=line_login_failed', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  const lineChannelId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID
  const lineChannelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/line/callback`

  try {
    // 1. Get Access Token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: lineChannelId!,
        client_secret: lineChannelSecret!
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Failed to get LINE access token:', tokenData)
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url))
    }

    // 2. Get User Profile
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    })

    const profileData = await profileResponse.json()
    const lineUid = profileData.userId

    if (!lineUid) {
      return NextResponse.redirect(new URL('/login?error=no_profile', request.url))
    }

    // 3. Perform Login with the lineUid we got
    const result = await loginWithLine(lineUid)
    
    if (result.registered) {
      return NextResponse.redirect(new URL(result.redirectTo ?? '/employee', request.url))
    } else {
      // Need Registration
      // We pass the line_uid via query string to the login page so the user can register
      return NextResponse.redirect(new URL(`/login?register=true&lineUid=${lineUid}`, request.url))
    }

  } catch (err) {
    console.error('LINE OAuth Callback Error:', err)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
