import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, ShoppingCart, Clock, CheckCircle, DollarSign } from 'lucide-react'
import { PurchaseOrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

const statusVariant: Record<PurchaseOrderStatus, 'warning' | 'default' | 'success' | 'destructive'> = {
  PENDING:   'warning',
  APPROVED:  'default',
  RECEIVED:  'success',
  CANCELLED: 'destructive',
}

export default async function PurchaseOrdersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  const sp      = await searchParams

  const canCreate = ['ADMIN', 'WAREHOUSE_MANAGER', 'SALES_MANAGER'].includes(session?.user?.role ?? '')

  const statusFilter = sp.status as PurchaseOrderStatus | undefined
  const search       = sp.search ?? ''
  const page         = Math.max(1, Number(sp.page ?? 1))
  const limit        = 20

  const where: any = {}
  if (statusFilter) where.status = statusFilter
  if (search)       where.supplier = { name: { contains: search, mode: 'insensitive' } }

  const [purchaseOrders, total, stats] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        _count:   { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.aggregate({
      _count: {
        _all: true,
      },
    }),
  ])

  // Stats: counts by status + total value of non-cancelled POs
  const [pendingCount, approvedCount, totalValueResult] = await Promise.all([
    prisma.purchaseOrder.count({ where: { status: 'PENDING' } }),
    prisma.purchaseOrder.count({ where: { status: 'APPROVED' } }),
    prisma.purchaseOrder.aggregate({
      where:  { status: { not: 'CANCELLED' } },
      _sum:   { totalAmount: true },
    }),
  ])

  const totalPages  = Math.ceil(total / limit)
  const totalValue  = Number(totalValueResult._sum.totalAmount ?? 0)
  const totalPOs    = stats._count._all

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Purchase Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} orders found</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus className="h-4 w-4 mr-1" /> New Purchase Order
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total POs',    value: totalPOs,                          icon: ShoppingCart, color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
          { label: 'Pending',      value: pendingCount,                      icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { label: 'Approved',     value: approvedCount,                     icon: CheckCircle,  color: 'text-sky-600',     bg: 'bg-sky-50 dark:bg-sky-950/40' },
          { label: 'Total Value',  value: formatCurrency(totalValue),        icon: DollarSign,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap gap-3">
            <select
              name="status"
              defaultValue={statusFilter ?? ''}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by supplier…"
              className="h-9 flex-1 min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />

            <Button type="submit" variant="outline" size="sm">Filter</Button>
            {(statusFilter || search) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/purchase-orders">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['PO ID', 'Supplier', 'Items', 'Status', 'Total Amount', 'Created', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                      ['Total Amount'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {po.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {po.supplier.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {po._count.lineItems} item{po._count.lineItems !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(Number(po.totalAmount))}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(po.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/purchase-orders/${po.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/purchase-orders?page=${page - 1}&status=${statusFilter ?? ''}&search=${search}`}>
                    Previous
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/purchase-orders?page=${page + 1}&status=${statusFilter ?? ''}&search=${search}`}>
                    Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
