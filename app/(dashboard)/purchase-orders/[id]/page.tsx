import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { POActions } from '@/components/purchase-orders/POActions'
import { PurchaseOrderStatus } from '@prisma/client'
import { ArrowLeft, Building2, ClipboardList, PackageCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusVariant: Record<PurchaseOrderStatus, 'warning' | 'default' | 'success' | 'destructive'> = {
  PENDING:   'warning',
  APPROVED:  'default',
  RECEIVED:  'success',
  CANCELLED: 'destructive',
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  const { id }  = await params

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier:  true,
      createdBy: { select: { id: true, name: true, email: true } },
      lineItems: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
      grns: {
        include: {
          receivedBy: { select: { id: true, name: true } },
        },
        orderBy: { receivedAt: 'desc' },
      },
    },
  })

  if (!po) notFound()

  const role = session?.user?.role ?? 'VIEWER'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono">
                PO-{po.id.slice(0, 8).toUpperCase()}
              </h1>
              <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created by {po.createdBy.name} on {formatDate(po.createdAt)}
            </p>
          </div>
        </div>

        <POActions poId={po.id} status={po.status} role={role} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" />
                Line Items
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Product', 'SKU', 'Unit', 'Quantity', 'Unit Price', 'Subtotal'].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                          ['Quantity', 'Unit Price', 'Subtotal'].includes(h) ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {po.lineItems.map((item) => {
                    const subtotal = Number(item.unitPrice) * item.quantity
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {item.product.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.product.sku}</td>
                        <td className="px-4 py-3 text-gray-500">{item.product.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(Number(item.unitPrice))}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Total Amount
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-gray-900 dark:text-gray-50">
                      {formatCurrency(Number(po.totalAmount))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* GRN History */}
          {po.grns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageCheck className="h-4 w-4" />
                  Goods Receipt Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {po.grns.map((grn) => (
                    <div
                      key={grn.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/20"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          GRN-{grn.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Received by {grn.receivedBy.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(grn.receivedAt)}</p>
                        {grn.notes && (
                          <p className="text-xs text-gray-500">{grn.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{po.supplier.name}</p>
              {po.supplier.email && (
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Email: </span>
                  {po.supplier.email}
                </p>
              )}
              {po.supplier.phone && (
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Phone: </span>
                  {po.supplier.phone}
                </p>
              )}
              {po.supplier.address && (
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Address: </span>
                  {po.supplier.address}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-400">Lead time:</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {po.supplier.leadTimeDays} days
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Rating:</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {Number(po.supplier.rating).toFixed(1)} / 5.0
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {po.lineItems.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Qty</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {po.lineItems.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Amount</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
                  {formatCurrency(Number(po.totalAmount))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
