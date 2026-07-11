import { getSessionUser } from '@/app/actions/auth'
import { fetchSystemSettings } from '@/app/actions/admin'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const user = await getSessionUser()

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">🚫</div>
        <h2 className="text-lg font-semibold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-gray-500 mt-1">หน้านี้สำหรับผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้น</p>
      </div>
    )
  }

  const settings = await fetchSystemSettings()

  return <SettingsClient settings={settings} />
}
