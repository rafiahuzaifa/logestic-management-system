import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { CustomerEditInline } from '@/components/customers/CustomerEditInline'

export const dynamic = 'force-dynamic'

const soStatusColor: Record<string, string> = {
  DRAFT: 'secondary', CONFIRMED: 'default', PACKED: 'default',
  SHIPPED: 'default', DELIVERED: 'default', CANCELLED: 'destructive',
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      salesOrders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { _count: { select: { lineItems: true } } },
      },
      _count: { select: { salesOrders: true } },
    },
  })
  if (!customer) notFound()

  const totalRevenue = customer.salesOrders.reduce((s, o) => s + Number(o.totalAmount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{customer.name}</h1>
          <p className="text-sm text-gray-500">{customer.email}</p>
        </div>
        <Button variant="outline" asChild><Link href="/customers">← Back</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <CustomerEditInline customer={{
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            companyType: customer.companyType,
            taxId: customer.taxId,
            creditLimit: customer.creditLimit?.toString() ?? null,
          }} />
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Orders</span>
                <span className="font-semibold text-[#387dff]">{customer._count.salesOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Credit Limit</span>
                <span className="font-semibold">
                  {customer.creditLimit != null ? formatCurrency(Number(customer.creditLimit)) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax ID</span>
                <span className="font-semibold">{customer.taxId ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Joined</span>
                <span className="font-semibold">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Sales Orders</CardTitle>
            <Link href={`/sales-orders?customer=${customer.id}`}>
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                <th className="px-4 py-2 text-left font-medium">Order ID</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-center font-medium">Items</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {customer.salesOrders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No orders yet</td></tr>
              ) : customer.salesOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-[#387dff]">
                    <Link href={`/sales-orders/${o.id}`}>{o.id.slice(0, 8).toUpperCase()}</Link>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={soStatusColor[o.status] as 'default' | 'secondary' | 'destructive'}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-center text-gray-500">{o._count.lineItems}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(o.totalAmount))}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
