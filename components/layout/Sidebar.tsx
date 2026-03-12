'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Building2,
  ShoppingCart,
  Truck,
  Warehouse,
  TrendingUp,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  BoxIcon,
  ChevronRight,
  Receipt,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { href: '/suppliers',        label: 'Suppliers',        icon: Building2 },
      { href: '/purchase-orders',  label: 'Purchase Orders',  icon: ShoppingCart },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/inventory',   label: 'Inventory',   icon: Package },
      { href: '/warehouses',  label: 'Warehouses',  icon: Warehouse },
      { href: '/shipments',   label: 'Shipments',   icon: Truck },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/invoices', label: 'Invoices', icon: Receipt },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/forecasting', label: 'Forecasting', icon: TrendingUp },
      { href: '/reports',     label: 'Reports',     icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/alerts',   label: 'Alerts',   icon: Bell },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="h-3 w-3 text-indigo-300" />}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin',
    WAREHOUSE_MANAGER: 'Warehouse Mgr',
    SALES_MANAGER: 'Sales Mgr',
    LOGISTICS_OFFICER: 'Logistics',
    VIEWER: 'Viewer',
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 border-r border-slate-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-900/50">
          <BoxIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 leading-none">Supply Chain</p>
          <p className="text-xs text-indigo-400 font-medium">Pro</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-5 px-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname === item.href || pathname.startsWith(item.href + '/')}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User Footer */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-slate-200">{session?.user?.name}</p>
            <p className="truncate text-xs text-slate-500">{roleLabel[session?.user?.role ?? ''] ?? session?.user?.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
