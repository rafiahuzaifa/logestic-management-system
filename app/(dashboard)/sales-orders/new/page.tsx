import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SalesOrderForm } from '@/components/sales-orders/SalesOrderForm'

export const dynamic = 'force-dynamic'

export default async function NewSalesOrderPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, price: true, unit: true } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">New Sales Order</h1>
        <p className="text-sm text-gray-500">Create a new sales order with line items</p>
      </div>
      <SalesOrderForm
        customers={customers}
        products={products.map((p) => ({ ...p, price: p.price.toString() }))}
      />
    </div>
  )
}
