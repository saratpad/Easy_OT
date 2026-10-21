'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FileText, CheckSquare, Settings, FolderOpen, Users, 
  Palette, User, BarChart3, Calendar, Database, Clock, 
  ChevronRight 
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  FileText,
  CheckSquare,
  Settings,
  FolderOpen,
  Users,
  Palette,
  User,
  BarChart3,
  Calendar,
  Database,
  Clock,
}

interface NavLinkProps {
  item: { name: string; href: string; iconName: string; badge?: string }
}

export default function NavLink({ item }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = item.href === '/admin'
    ? pathname === '/admin'
    : pathname.startsWith(item.href)

  const IconComponent = ICON_MAP[item.iconName] || FileText

  return (
    <Link
      href={item.href}
      className={`group relative flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 font-semibold translate-x-0.5'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:translate-x-0.5'
      }`}
    >
      <div className="flex items-center min-w-0">
        <div className={`p-1.5 rounded-lg mr-2.5 transition-colors ${
          isActive 
            ? 'bg-white/20 text-white' 
            : 'text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50'
        }`}>
          <IconComponent className="w-4 h-4 shrink-0" />
        </div>
        <span className="truncate">{item.name}</span>
      </div>

      {isActive ? (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
      ) : item.badge ? (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}
