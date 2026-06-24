import { useState } from 'react'
import { Menu, Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const ROLE_LABEL = {
  employee:             'เจ้าหน้าที่',
  supervisor:           'ผู้อนุมัติระดับ ๑',
  commander:            'ผู้อนุมัติระดับ ๒',
  supervising_commander:'ผู้กำกับดูแล',
  sub_admin:            'ผู้ดูแลแผนก',
  super_admin:          'ผู้ดูแลระบบ',
}

export function Topbar({ onMenuToggle }) {
  const { profile } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="brand-icon">⏱️</div>
        <span>Easy-OT</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'rgba(255,255,255,.5)', marginLeft: '0.25rem' }}>
          ระบบขออนุมัติทำงานล่วงเวลา
        </span>
      </div>

      <div className="topbar-right">
        <div className="user-chip">
          <div className="user-avatar">
            {(profile?.first_name?.[0] || '?').toUpperCase()}
          </div>
          <span>
            {profile ? `${profile.first_name} ${profile.last_name}` : '...'}
          </span>
          <span style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.72rem' }}>
            · {ROLE_LABEL[profile?.role] || profile?.role}
          </span>
        </div>
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'none' }}
          className="hamburger-btn"
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
      </div>
    </header>
  )
}
