import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ShipmentStatusUpdate } from '@/components/shipments/ShipmentStatusUpdate'
import { ShipmentStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<ShipmentStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING:    'secondary',
  IN_TRANSIT: 'default',
  DELIVERED:  'success',
  DELAYED:    'warning',
}

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const canEdit = ['ADMIN', 'WAREHOUSE_MANAGER', 'LOGISTICS_OFFICER'].includes(session?.user?.role ?? '')
  const { id }  = await params

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      carrier:    true,
      salesOrder: {
        include: {
          customer:  true,
          lineItems: { include: { product: { select: { name: true, sku: true } } } },
        },
      },
    },
  })
  if (!shipment) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/shipments"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Shipment {shipment.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-gray-500">{shipment.salesOrder?.customer?.name ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_COLORS[shipment.status]}>{shipment.status.replace('_', ' ')}</Badge>
          {canEdit && <ShipmentStatusUpdate shipmentId={shipment.id} currentStatus={shipment.status} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Shipment Info</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Tracking #',      shipment.trackingNumber ?? '—'],
                  ['Carrier',         shipment.carrier?.name ?? '—'],
                  ['Contact',         shipment.carrier?.contactPerson ?? '—'],
                  ['Carrier Phone',   shipment.carrier?.phone ?? '—'],
                  ['Est. Delivery',   shipment.estimatedDelivery ? formatDate(shipment.estimatedDelivery) : '—'],
                  ['Created At',      formatDateTime(shipment.createdAt)],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">Product</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">SKU</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-400">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {shipment.salesOrder?.lineItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.product.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.product.sku}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100">{shipment.salesOrder?.customer?.name}</p>
              {shipment.salesOrder?.customer?.email && (
                <a href={`mailto:${shipment.salesOrder.customer.email}`} className="text-indigo-600 hover:underline block">
                  {shipment.salesOrder.customer.email}
                </a>
              )}
              {shipment.salesOrder?.customer?.phone && (
                <p className="text-gray-500">{shipment.salesOrder.customer.phone}</p>
              )}
              {shipment.salesOrder?.customer?.address && (
                <p className="text-gray-500">{shipment.salesOrder.customer.address}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
