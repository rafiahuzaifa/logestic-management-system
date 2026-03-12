import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'

export const dynamic = 'force-dynamic'

export default async function NewInvoicePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const salesOrders = await prisma.salesOrder.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  })

  const serializable = salesOrders.map((so) => ({
    id: so.id,
    customer: { name: so.customer.name },
    totalAmount: so.totalAmount.toString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">New Invoice</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create a billing invoice with company name, billing period, vendor &amp; selling price
        </p>
      </div>
      <InvoiceForm salesOrders={serializable} />
    </div>
  )
}
