import { getSessionUser } from '@/app/actions/auth'
import { getHolidays } from '@/app/actions/holidays'
import HolidaysClient from './HolidaysClient'

export default async function HolidaysPage() {
  const user = await getSessionUser()
  
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">🚫</div>
        <h2 className="text-lg font-semibold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ Super Admin)</h2>
      </div>
    )
  }

  const holidays = await getHolidays()

  return <HolidaysClient initialHolidays={holidays} />
}
