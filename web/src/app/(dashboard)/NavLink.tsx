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

interface NavLinkProps {
  item: { name: string; href: string; iconName: string }
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
      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] shadow-sm'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <IconComponent className={`mr-3 w-5 h-5 ${isActive ? 'text-[var(--sidebar-active-text)]' : 'text-gray-400'}`} />
      {item.name}
    </Link>
  )
}
