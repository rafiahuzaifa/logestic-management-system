'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Order {
  id: string
  customer: string
  status: string
  amount: number
  items: number
  date: string
}

interface RecentOrdersTableProps {
  orders: Order[]
}

const statusVariantMap: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  DELIVERED: 'success',
  SHIPPED:   'default',
  PACKED:    'secondary',
  CONFIRMED: 'warning',
  DRAFT:     'secondary',
  CANCELLED: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Delivered',
  SHIPPED:   'Shipped',
  PACKED:    'Packed',
  CONFIRMED: 'Confirmed',
  DRAFT:     'Draft',
  CANCELLED: 'Cancelled',
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {['Order', 'Customer', 'Items', 'Status', 'Amount', 'Date'].map((h) => (
              <th key={h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 ${h === 'Amount' || h === 'Date' ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/sales-orders/${o.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  {o.id.slice(0, 8).toUpperCase()}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{o.customer}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{o.items}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariantMap[o.status] ?? 'secondary'}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(o.amount)}
              </td>
              <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                {formatDate(o.date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
