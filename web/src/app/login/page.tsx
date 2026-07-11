import { fetchSystemSettings } from '@/app/actions/admin'
import LoginClient from './LoginClient'
import { Suspense } from 'react'

export default async function LoginPage() {
  let settings: Record<string, string> = {}
  try {
    settings = await fetchSystemSettings()
  } catch { /* ใช้ค่าเริ่มต้น */ }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>}>
      <LoginClient
        appName={settings.app_name || 'Easy OT'}
        logoUrl={settings.logo_url || ''}
        primaryColor={settings.primary_color || '#2563eb'}
        announcement={settings.login_announcement || ''}
        announcementType={settings.announcement_type || 'info'}
        announcementFormat={settings.announcement_format || 'text'}
        announcementImageUrl={settings.announcement_image_url || ''}
        announcementShowAt={settings.announcement_show_at || 'before_login'}
        announcementActive={settings.announcement_active !== 'false'}
      />
    </Suspense>
  )
}
