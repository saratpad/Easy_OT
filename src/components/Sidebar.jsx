import { useNavigate, useLocation } from 'react-router-dom'
import {
  FileText, Users, Settings, LogOut, Home, ClipboardList,
  CheckSquare, Shield, Building2, Menu, X, BarChart2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const NAV_BY_ROLE = {
  employee: [
    { path: '/dashboard',  icon: Home,          label: 'หน้าหลัก' },
    { path: '/my-requests',icon: FileText,       label: 'คำขอของฉัน' },
  ],
  supervisor: [
    { path: '/dashboard',  icon: Home,          label: 'หน้าหลัก' },
    { path: '/my-requests',icon: FileText,       label: 'คำขอของฉัน' },
    { path: '/approve',    icon: CheckSquare,    label: 'รายการรออนุมัติ' },
    { path: '/report',     icon: BarChart2,      label: 'รายงาน' },
  ],
  commander: [
    { path: '/dashboard',  icon: Home,          label: 'หน้าหลัก' },
    { path: '/approve',    icon: CheckSquare,    label: 'รายการรออนุมัติ' },
    { path: '/export',     icon: FileText,       label: 'ส่งออกเอกสาร' },
    { path: '/report',     icon: BarChart2,      label: 'รายงาน' },
  ],
  supervising_commander: [
    { path: '/dashboard',  icon: Home,          label: 'หน้าหลัก' },
    { path: '/approve',    icon: CheckSquare,    label: 'รายการรออนุมัติ' },
  ],
  sub_admin: [
    { path: '/dashboard',  icon: Home,          label: 'หน้าหลัก' },
    { path: '/manage-users',icon: Users,         label: 'จัดการผู้ใช้งาน' },
    { path: '/dept-config', icon: Settings,      label: 'ตั้งค่าแผนก' },
    { path: '/tasks',       icon: ClipboardList, label: 'จัดการภารกิจ' },
    { path: '/report',      icon: BarChart2,     label: 'รายงาน' },
    { path: '/export',      icon: FileText,      label: 'ส่งออกเอกสาร' },
  ],
  super_admin: [
    { path: '/dashboard',       icon: Home,       label: 'หน้าหลัก' },
    { path: '/departments',     icon: Building2,  label: 'จัดการแผนก' },
    { path: '/manage-users',    icon: Users,      label: 'ผู้ใช้งานทั้งหมด' },
    { path: '/positions',       icon: Shield,     label: 'ตำแหน่ง / ลำดับ' },
    { path: '/tasks',           icon: ClipboardList, label: 'จัดการภารกิจ' },
    { path: '/report',          icon: BarChart2,  label: 'รายงาน' },
  ],
}

const ROLE_LABEL = {
  employee:             'เจ้าหน้าที่',
  supervisor:           'ผู้อนุมัติระดับ ๑',
  commander:            'ผู้อนุมัติระดับ ๒',
  supervising_commander:'ผู้กำกับดูแล',
  sub_admin:            'ผู้ดูแลแผนก',
  super_admin:          'ผู้ดูแลระบบ',
}

export function Sidebar({ mobileOpen, onMobileClose }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const role = profile?.role || 'employee'
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.employee

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Mobile close */}
      <button
        onClick={onMobileClose}
        style={{ display: 'none', position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}
        className="sidebar-close-btn"
      >
        <X size={20} />
      </button>

      {/* Profile section */}
      <div style={{ padding: '0.5rem 1.25rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="user-avatar" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>
            {(profile?.first_name?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile ? `${profile.first_name} ${profile.last_name}` : '...'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,.5)', marginTop: '0.1rem' }}>
              {ROLE_LABEL[role] || role}
            </div>
          </div>
        </div>
        {profile?.department?.name_th && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,.4)', paddingLeft: '0.25rem' }}>
            📂 {profile.department.name_th}
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.08)', margin: '0 1rem 0.75rem' }} />

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="nav-group-label">เมนูหลัก</span>
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            className={`nav-item ${location.pathname === path ? 'active' : ''}`}
            onClick={() => { navigate(path); onMobileClose?.() }}
          >
            <Icon size={18} className="nav-icon" />
            {label}
          </button>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '0.75rem 1rem 0.5rem', marginTop: 'auto' }}>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.08)', marginBottom: '0.75rem' }} />
        <button className="nav-item" onClick={handleSignOut}>
          <LogOut size={18} className="nav-icon" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
