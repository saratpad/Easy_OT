import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SESSION_COOKIE_NAME = 'easyot_session'

// Roles that can access each route
const ADMIN_ROLES = ['super_admin', 'sub_admin']
const APPROVER_ROLES = ['supervisor', 'director', 'executive', 'super_admin', 'sub_admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get session user ID from cookie
  const userId = request.cookies.get(SESSION_COOKIE_NAME)?.value

  // ─── Not logged in ─────────────────────────────────────────────────────────
  if (!userId) {
    // Allow access to login page only
    if (pathname === '/login') {
      return NextResponse.next()
    }
    // Redirect everything else to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ─── Already logged in → redirect away from login ──────────────────────────
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/employee', request.url))
  }

  // ─── Fetch user role from Supabase (server-side) ───────────────────────────
  let role: string | null = null
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    role = user?.role ?? null
  } catch {
    // If Supabase fails, allow through — page-level check handles it
    return NextResponse.next()
  }

  if (!role) {
    // Invalid session — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // ─── Route Protection ──────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!ADMIN_ROLES.includes(role)) {
      // Non-admin trying to access admin → redirect to their home
      const home = APPROVER_ROLES.includes(role) ? '/approver' : '/employee'
      return NextResponse.redirect(new URL(home, request.url))
    }
  }

  if (pathname.startsWith('/approver')) {
    if (!APPROVER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/employee', request.url))
    }
  }

  // ─── Root redirect ─────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    if (APPROVER_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/approver', request.url))
    }
    return NextResponse.redirect(new URL('/employee', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
