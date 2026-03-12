import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Truck, Plus, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ShipmentStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<ShipmentStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING:    'secondary',
  IN_TRANSIT: 'default',
  DELIVERED:  'success',
  DELAYED:    'warning',
}

export default async function ShipmentsPage() {
  const session  = await getServerSession(authOptions)
  const canEdit  = ['ADMIN', 'WAREHOUSE_MANAGER', 'LOGISTICS_OFFICER'].includes(session?.user?.role ?? '')

  const shipments = await prisma.shipment.findMany({
    include: {
      carrier:    { select: { name: true } },
      salesOrder: { select: { id: true, customer: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const stats = {
    total:     shipments.length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    delivered: shipments.filter(s => s.status === 'DELIVERED').length,
    delayed:   shipments.filter(s => s.status === 'DELAYED').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Shipments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track all carrier shipments and deliveries</p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/shipments/new"><Plus className="h-4 w-4 mr-1.5" />New Shipment</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',      value: stats.total,     icon: Truck,          color: 'text-gray-700 dark:text-gray-200',  bg: 'bg-gray-100 dark:bg-gray-800' },
          { label: 'In Transit', value: stats.inTransit, icon: Truck,          color: 'text-indigo-600',                   bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
          { label: 'Delivered',  value: stats.delivered, icon: CheckCircle,    color: 'text-emerald-600',                  bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Delayed',    value: stats.delayed,   icon: AlertTriangle,  color: 'text-amber-600',                    bg: 'bg-amber-50 dark:bg-amber-950/40' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['ID', 'Customer', 'Carrier', 'Tracking #', 'Status', 'Est. Delivery', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No shipments found</p>
                  </td>
                </tr>
              ) : (
                shipments.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{s.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{s.salesOrder?.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.carrier?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.trackingNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[s.status]}>{s.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.estimatedDelivery ? formatDate(s.estimatedDelivery) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/shipments/${s.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
