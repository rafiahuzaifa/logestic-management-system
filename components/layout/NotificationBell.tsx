'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, Package, Truck, FileText, ShoppingCart, AlertTriangle, Info, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  entityType?: string | null
  entityId?: string | null
  isRead: boolean
  createdAt: string
}

const typeIcon: Record<string, React.ElementType> = {
  LOW_STOCK: Package,
  SHIPMENT_DELAYED: Truck,
  SHIPMENT_DELIVERED: Truck,
  NEW_ORDER: ShoppingCart,
  ORDER_APPROVED: ShoppingCart,
  INVOICE_OVERDUE: FileText,
  INVOICE_PAID: FileText,
  PO_APPROVED: ShoppingCart,
  PO_RECEIVED: Package,
  SYSTEM: Info,
}

const typeColor: Record<string, string> = {
  LOW_STOCK: 'text-amber-500',
  SHIPMENT_DELAYED: 'text-red-500',
  SHIPMENT_DELIVERED: 'text-green-500',
  NEW_ORDER: 'text-blue-500',
  ORDER_APPROVED: 'text-green-500',
  INVOICE_OVERDUE: 'text-red-500',
  INVOICE_PAID: 'text-green-500',
  PO_APPROVED: 'text-blue-500',
  PO_RECEIVED: 'text-green-500',
  SYSTEM: 'text-gray-500',
}

const entityLink: Record<string, string> = {
  product: '/inventory',
  shipment: '/shipments',
  invoice: '/invoices',
  sales_order: '/sales-orders',
  purchase_order: '/purchase-orders',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    setLoading(true)
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    setLoading(false)
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const clearAll = async () => {
    setLoading(true)
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifications([])
    setUnreadCount(0)
    setLoading(false)
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications() }}
        className="relative text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-96 rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#387dff]" />
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#387dff] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#387dff] hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" /> All read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={loading}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Clear all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">Activity will appear here</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcon[n.type] ?? AlertTriangle
                const color = typeColor[n.type] ?? 'text-gray-500'
                const href = n.entityType && n.entityId
                  ? `${entityLink[n.entityType] ?? '#'}/${n.entityId}`
                  : (n.entityType ? entityLink[n.entityType] : null)

                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                      !n.isRead && 'bg-blue-50/50 dark:bg-blue-900/10'
                    )}
                  >
                    <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', !n.isRead ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800')}>
                      <Icon className={cn('h-3.5 w-3.5', color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium leading-snug', !n.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="shrink-0 rounded p-0.5 text-gray-400 hover:text-[#387dff]"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 leading-snug line-clamp-2">{n.message}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                        {href && (
                          <Link
                            href={href}
                            onClick={() => { markRead(n.id); setOpen(false) }}
                            className="text-[10px] text-[#387dff] hover:underline"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
              <Link
                href="/alerts"
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-[#387dff] hover:underline"
              >
                Manage alert settings
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
