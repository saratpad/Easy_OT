'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FileText, CheckSquare, Settings, FolderOpen, Users, 
  Palette, User, BarChart3, Calendar, Database, Clock 
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

interface MobileNavLinkProps {
  item: { name: string; href: string; iconName: string }
}

export default function MobileNavLink({ item }: MobileNavLinkProps) {
  const pathname = usePathname()
  const isActive = item.href === '/admin'
    ? pathname === '/admin'
    : pathname.startsWith(item.href)

  const IconComponent = ICON_MAP[item.iconName] || FileText

  return (
    <Link
      href={item.href}
      className={`relative flex-1 flex flex-col items-center justify-center py-2.5 text-[11px] font-medium transition-all ${
        isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {isActive && (
        <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-full shadow-sm shadow-blue-500/50" />
      )}
      <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-50 text-blue-600' : ''}`}>
        <IconComponent className="w-5 h-5 mb-0.5 shrink-0" />
      </div>
      <span className="truncate max-w-[64px] tracking-tight">{item.name.split(' ')[0]}</span>
    </Link>
  )
}
