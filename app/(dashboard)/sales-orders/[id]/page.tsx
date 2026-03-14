import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { SalesOrderStatusUpdater } from '@/components/sales-orders/SalesOrderStatusUpdater'

export const dynamic = 'force-dynamic'

const statusVariant: Record<string, string> = {
  DRAFT: 'secondary', CONFIRMED: 'default', PACKED: 'warning',
  SHIPPED: 'default', DELIVERED: 'success', CANCELLED: 'destructive',
}

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const { id } = await params

  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
      lineItems: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
      invoices: true,
      shipments: { include: { carrier: true } },
    },
  })
  if (!order) notFound()

  const canEdit = ['ADMIN', 'SALES_MANAGER'].includes(session?.user?.role ?? '')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            Order {id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500">Customer: {order.customer.name}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && <SalesOrderStatusUpdater orderId={order.id} currentStatus={order.status} />}
          <Button variant="outline" asChild><Link href="/sales-orders">← Back</Link></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                    <th className="px-4 py-2 text-left font-medium">Product</th>
                    <th className="px-4 py-2 text-left font-medium">SKU</th>
                    <th className="px-4 py-2 text-center font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {order.lineItems.map((li) => (
                    <tr key={li.id}>
                      <td className="px-4 py-2 font-medium">{li.product.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{li.product.sku}</td>
                      <td className="px-4 py-2 text-center">{li.quantity} {li.product.unit}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(Number(li.unitPrice))}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatCurrency(li.quantity * Number(li.unitPrice))}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan={4} className="px-4 py-2 text-right font-semibold">Total</td>
                    <td className="px-4 py-2 text-right font-bold text-[#387dff]">
                      {formatCurrency(Number(order.totalAmount))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Shipments */}
          {order.shipments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Shipments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {order.shipments.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{s.carrier.name}</p>
                      <p className="text-xs text-gray-500">{s.trackingNumber ?? 'No tracking'}</p>
                    </div>
                    <Badge variant="secondary">{s.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Order Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge variant={statusVariant[order.status] as 'default' | 'secondary' | 'destructive' | 'warning' | 'success'}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <Link href={`/customers/${order.customer.id}`} className="font-medium text-[#387dff] hover:underline">
                  {order.customer.name}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created by</span>
                <span className="font-medium">{order.createdBy.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invoices</span>
                <span className="font-semibold text-[#387dff]">{order.invoices.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
