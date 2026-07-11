import { getSessionUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">ข้อมูลส่วนตัว</h2>
        <p className="text-sm text-gray-500 mt-1">อัปเดตข้อมูล โปรไฟล์ รหัสผ่าน และลายเซ็นของคุณ</p>
      </div>

      <ProfileClient user={user} />
    </div>
  )
}
