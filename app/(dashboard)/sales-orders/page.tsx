import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { SalesOrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

const statusVariant: Record<SalesOrderStatus, 'warning' | 'default' | 'success' | 'destructive' | 'secondary'> = {
  DRAFT:     'secondary',
  CONFIRMED: 'default',
  PACKED:    'warning',
  SHIPPED:   'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

export default async function SalesOrdersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const sp = await searchParams
  const statusFilter = (sp.status as SalesOrderStatus) || undefined
  const search = sp.search ?? ''
  const page = Math.max(1, Number(sp.page ?? 1))
  const limit = 20

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (statusFilter) where.status = statusFilter
  if (search) where.customer = { name: { contains: search, mode: 'insensitive' } }

  const [orders, total, stats] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.salesOrder.count({ where }),
    Promise.all([
      prisma.salesOrder.count({ where: { status: 'DRAFT' } }),
      prisma.salesOrder.count({ where: { status: 'CONFIRMED' } }),
      prisma.salesOrder.count({ where: { status: 'DELIVERED' } }),
      prisma.salesOrder.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'CANCELLED' } } }),
    ]),
  ])

  const [draftCount, confirmedCount, deliveredCount, totalValueRes] = stats
  const totalPages = Math.ceil(total / limit)
  const totalValue = Number(totalValueRes._sum.totalAmount ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Sales Orders</h1>
          <p className="text-sm text-gray-500">{total} orders</p>
        </div>
        <Link href="/sales-orders/new">
          <Button className="bg-[#387dff] hover:bg-[#2563eb]">
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Draft',      value: draftCount },
          { label: 'Confirmed',  value: confirmedCount },
          { label: 'Delivered',  value: deliveredCount },
          { label: 'Total Value',value: formatCurrency(totalValue) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap gap-3">
            <select
              name="status"
              defaultValue={statusFilter ?? ''}
              className="h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#387dff] dark:bg-gray-900 dark:border-gray-700"
            >
              <option value="">All Statuses</option>
              {(['DRAFT','CONFIRMED','PACKED','SHIPPED','DELIVERED','CANCELLED'] as const).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by customer…"
              className="h-9 flex-1 min-w-[200px] rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#387dff] dark:bg-gray-900 dark:border-gray-700"
            />
            <Button type="submit" variant="outline" size="sm">Filter</Button>
            {(statusFilter || search) && (
              <Button variant="ghost" size="sm" asChild><Link href="/sales-orders">Clear</Link></Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left font-medium">Order ID</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-center font-medium">Items</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No orders found</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#387dff]">
                    {o.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{o.customer.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{o._count.lineItems}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(o.totalAmount))}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/sales-orders/${o.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/sales-orders?page=${page-1}&status=${statusFilter??''}&search=${search}`}>Previous</Link>
                </Button>
              )}
              {page < totalPages && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/sales-orders?page=${page+1}&status=${statusFilter??''}&search=${search}`}>Next</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
