'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

const labelMap: Record<string, string> = {
  dashboard:       'Dashboard',
  inventory:       'Inventory',
  suppliers:       'Suppliers',
  'purchase-orders': 'Purchase Orders',
  shipments:       'Shipments',
  warehouses:      'Warehouses',
  forecasting:     'Forecasting',
  reports:         'Reports',
  alerts:          'Alerts',
  settings:        'Settings',
  new:             'New',
  edit:            'Edit',
  profile:         'Profile',
  users:           'Users',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
      <Link href="/dashboard" className="flex items-center hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        const label = labelMap[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1)
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
            ) : (
              <Link href={href} className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
