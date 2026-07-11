'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/actions/auth'

interface LogoutButtonProps {
  compact?: boolean
}

export default function LogoutButton({ compact = false }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-md"
        title="ออกจากระบบ"
      >
        <LogOut className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
    >
      <LogOut className="mr-2 w-4 h-4" />
      ออกจากระบบ
    </button>
  )
}
