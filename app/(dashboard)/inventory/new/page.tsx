import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProductForm } from '@/components/inventory/ProductForm'

export default async function NewProductPage() {
  const session = await getServerSession(authOptions)
  if (!['ADMIN', 'WAREHOUSE_MANAGER'].includes(session?.user?.role ?? '')) {
    redirect('/inventory')
  }

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Add Product</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create a new product in the inventory</p>
      </div>
      <ProductForm categories={categories} mode="create" />
    </div>
  )
}
