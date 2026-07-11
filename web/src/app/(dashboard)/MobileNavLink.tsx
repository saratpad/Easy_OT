'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, CheckSquare, Settings, FolderOpen, Users, Palette, User, BarChart3, Calendar } from 'lucide-react'

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
      className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
        isActive ? 'text-primary' : 'text-gray-500'
      }`}
    >
      <IconComponent className={`w-5 h-5 mb-0.5 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
      <span className="truncate max-w-[56px]">{item.name.split(' ')[0]}</span>
    </Link>
  )
}
