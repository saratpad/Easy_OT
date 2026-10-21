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
    try {
      await logout()
    } finally {
      window.location.href = '/login'
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl active:scale-95"
        title="ออกจากระบบ"
        aria-label="ออกจากระบบ"
      >
        <LogOut className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center justify-center w-full px-4 py-2.5 text-xs sm:text-sm font-semibold text-rose-600 bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/60 rounded-xl transition-all shadow-sm active:scale-[0.99]"
    >
      <LogOut className="mr-2 w-4 h-4" />
      ออกจากระบบ
    </button>
  )
}
