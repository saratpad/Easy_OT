import { getSessionUser } from '@/app/actions/auth'
import { fetchSystemSettings } from '@/app/actions/admin'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'
import AnnouncementPopup from '@/components/AnnouncementPopup'
import EmployeeOTReportPopup from '@/components/EmployeeOTReportPopup'
import type { UserRole } from '@/types/database'
import NavLink from './NavLink'
import MobileNavLink from './MobileNavLink'
import { Clock, Calendar as CalendarIcon, Shield, Sparkles, Building2 } from 'lucide-react'

const ADMIN_ROLES: UserRole[] = ['super_admin', 'sub_admin']
const APPROVER_ROLES: UserRole[] = ['supervisor', 'director', 'executive', 'super_admin', 'sub_admin']

const ROLE_LABELS: Record<string, string> = {
  employee: 'เจ้าหน้าที่',
  supervisor: 'ผอ.กลุ่ม',
  director: 'ผอ.กอง',
  executive: 'ผู้บริหาร',
  sub_admin: 'ผู้ดูแล (กอง)',
  super_admin: 'ผู้ดูแลระบบ',
}

interface NavSection {
  title?: string
  items: { name: string; href: string; iconName: string; badge?: string }[]
}

function getNavSections(role: UserRole): NavSection[] {
  const sections: NavSection[] = []

  // 1. เมนูหลัก
  const mainItems = [
    { name: 'ข้อมูลส่วนตัว', href: '/profile', iconName: 'User' }
  ]
  if (!ADMIN_ROLES.includes(role)) {
    mainItems.push({ name: 'ขอ OT ของฉัน', href: '/employee', iconName: 'FileText' })
  }
  sections.push({ title: 'เมนูหลัก', items: mainItems })

  // 2. การอนุมัติและติดตาม
  if (APPROVER_ROLES.includes(role)) {
    const approverItems = [
      { name: 'ภาพรวมสถิติ', href: '/overview', iconName: 'BarChart3' },
      { name: 'อนุมัติ OT', href: '/approver', iconName: 'CheckSquare' },
    ]
    sections.push({ title: 'งานอนุมัติ & สถิติ', items: approverItems })
  }

  // 3. การจัดการระบบ
  if (ADMIN_ROLES.includes(role)) {
    const adminItems = [
      { name: 'ออกเอกสารคำขอ', href: '/admin/documents', iconName: 'FolderOpen' },
      { name: 'ตั้งค่ากองงาน', href: '/admin', iconName: 'Settings' },
    ]

    if (role === 'super_admin') {
      adminItems.push(
        { name: 'จัดการผู้ใช้งาน', href: '/admin/users', iconName: 'Users' },
        { name: 'วันหยุดราชการ', href: '/admin/holidays', iconName: 'Calendar' },
        { name: 'จัดการฐานข้อมูล', href: '/admin/database', iconName: 'Database' },
        { name: 'ตั้งค่าระบบกลาง', href: '/admin/settings', iconName: 'Palette' }
      )
    }

    sections.push({ title: 'การจัดการระบบ', items: adminItems })
  }

  return sections
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const role = user.role as UserRole
  const navSections = getNavSections(role)
  const allNavItems = navSections.flatMap(s => s.items)
  
  let appName = 'Easy OT'
  let logoUrl = ''
  let primaryColor = '#2563eb'
  let announcementActive = false
  let announcementFormat = 'text'
  let announcement = ''
  let announcementType = 'info'
  let announcementImageUrl = ''
  let announcementShowAt = 'before_login'
  
  try {
    const settings = await fetchSystemSettings()
    if (settings) {
      appName = settings.app_name || 'Easy OT'
      logoUrl = settings.logo_url || ''
      primaryColor = settings.primary_color || '#2563eb'
      announcementActive = settings.announcement_active !== 'false'
      announcementFormat = settings.announcement_format || 'text'
      announcement = settings.login_announcement || ''
      announcementType = settings.announcement_type || 'info'
      announcementImageUrl = settings.announcement_image_url || ''
      announcementShowAt = settings.announcement_show_at || 'before_login'
    }
  } catch { /* ใช้ค่าเริ่มต้น */ }

  // Thai Date formatting for header
  const now = new Date()
  const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์']
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  const thaiDateString = `${thaiDays[now.getDay()]}ที่ ${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}`

  const userInitial = user.full_name ? user.full_name.charAt(0) : 'U'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/20 to-indigo-50/15 flex">
      <AnnouncementPopup 
        announcementActive={announcementActive}
        announcementFormat={announcementFormat}
        announcement={announcement}
        announcementType={announcementType}
        announcementImageUrl={announcementImageUrl}
        announcementShowAt={announcementShowAt}
      />
      <EmployeeOTReportPopup />

      <style>{`
        :root {
          --primary: ${primaryColor};
          --color-primary: ${primaryColor};
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200/80 hidden md:flex flex-col shadow-sm z-20 shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-9 h-9 rounded-xl mr-3 shrink-0 object-contain shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center mr-3 shrink-0 shadow-md shadow-blue-500/20">
                <Clock className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate tracking-tight font-display">{appName}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-medium text-slate-400">ระบบออนไลน์</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/70 shadow-sm relative group">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.full_name || 'ผู้ใช้งาน'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.position || 'ตำแหน่งงาน'}</p>
              </div>
            </div>
            <LogoutButton compact />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/50">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border badge-${role}`}>
              {ROLE_LABELS[role] || role}
            </span>
            {user.division && (
              <span className="text-[10px] text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={(user.division as any).name}>
                {(user.division as any).name}
              </span>
            )}
          </div>
        </div>

        {/* Categorized Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 text-center">
          <span className="text-[10px] text-slate-400 font-medium">
            {appName} v2.4 Pro
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 items-center justify-between px-6 lg:px-8 shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{user.division ? (user.division as any).name : 'ระบบขออนุมัติ OT'}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Thai Date Widget */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>{thaiDateString}</span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border badge-${role}`}>
                {ROLE_LABELS[role] || role}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 shrink-0 shadow-xs z-20 sticky top-0">
          <div className="flex items-center min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-7 h-7 rounded-lg mr-2 object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mr-2 shadow-xs">
                <Clock className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate font-display">{appName}</h1>
              <p className="text-[10px] text-slate-500 truncate">{ROLE_LABELS[role] || role}</p>
            </div>
          </div>
          <LogoutButton compact />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 z-30 flex shadow-lg">
          {allNavItems.slice(0, 5).map((item) => (
            <MobileNavLink key={item.href} item={item} />
          ))}
        </nav>
      </main>
    </div>
  )
}
