import { getSessionUser } from '@/app/actions/auth'
import { fetchSystemSettings } from '@/app/actions/admin'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'
import AnnouncementPopup from '@/components/AnnouncementPopup'
import EmployeeOTReportPopup from '@/components/EmployeeOTReportPopup'
import type { UserRole } from '@/types/database'

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

function getNavItems(role: UserRole) {
  const items = []

  // ข้อมูลส่วนตัว
  items.push({ name: 'ข้อมูลส่วนตัว', href: '/profile', iconName: 'User' })
  
  // ขอ OT เฉพาะคนที่ไม่ใช่ Admin 
  if (!ADMIN_ROLES.includes(role)) {
    items.push({ name: 'ขอ OT', href: '/employee', iconName: 'FileText' })
  }

  // Approver roles เห็นหน้าอนุมัติ และหน้าภาพรวม
  if (APPROVER_ROLES.includes(role)) {
    items.push({ name: 'ภาพรวม', href: '/overview', iconName: 'BarChart3' })
    items.push({ name: 'อนุมัติ OT', href: '/approver', iconName: 'CheckSquare' })
  }

  // Admin roles
  if (ADMIN_ROLES.includes(role)) {
    items.push({ name: 'ออกเอกสาร', href: '/admin/documents', iconName: 'FolderOpen' })
    items.push({ name: 'ตั้งค่ากอง', href: '/admin', iconName: 'Settings' })
  }

  // เฉพาะ super_admin เท่านั้น
  if (role === 'super_admin') {
    items.push({ name: 'จัดการผู้ใช้ทั้งระบบ', href: '/admin/users', iconName: 'Users' })
    items.push({ name: 'จัดการวันหยุดราชการ', href: '/admin/holidays', iconName: 'Calendar' })
    items.push({ name: 'จัดการฐานข้อมูล', href: '/admin/database', iconName: 'Database' })
    items.push({ name: 'ตั้งค่าระบบ', href: '/admin/settings', iconName: 'Palette' })
  }

  return items
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
  const navItems = getNavItems(role)
  
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

  console.log('Layout Announcement Settings:', {
    announcementActive,
    announcementFormat,
    announcementShowAt,
    announcementImageUrl,
  })

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col shadow-sm z-10">
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="w-8 h-8 rounded-lg mr-3 shrink-0 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0" style={{backgroundColor: primaryColor}}>
              <span className="text-white font-bold text-sm">OT</span>
            </div>
          )}
          <h1 className="text-md font-bold text-gray-800 truncate">{appName}</h1>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 flex flex-col relative group">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.full_name || 'ผู้ใช้งาน'}</p>
              <p className="text-xs text-gray-500 truncate">{user.position || ''}</p>
            </div>
            <LogoutButton compact />
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border badge-${role}`}>
              {ROLE_LABELS[role] || role}
            </span>
            {user.division && (
              <span className="text-[10px] text-blue-600 truncate">{(user.division as any).name}</span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50/50">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-7 h-7 rounded-lg mr-2 object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2" style={{backgroundColor: primaryColor}}>
                <span className="text-white font-bold text-xs">OT</span>
              </div>
            )}
            <h1 className="text-sm font-bold text-gray-800 truncate">{appName}</h1>
          </div>
          <LogoutButton compact />
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 flex">
          {navItems.slice(0, 5).map((item) => (
            <MobileNavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="flex-1 overflow-auto pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Sub-components (Client) ─────────────────────────────────────────────────

import NavLink from './NavLink'
import MobileNavLink from './MobileNavLink'

