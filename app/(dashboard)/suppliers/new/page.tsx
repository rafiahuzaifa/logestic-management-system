import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SupplierForm } from '@/components/suppliers/SupplierForm'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewSupplierPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'WAREHOUSE_MANAGER'].includes(session.user.role)) {
    redirect('/suppliers')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">New Supplier</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add a new supplier to the system
          </p>
        </div>
      </div>

      <SupplierForm mode="create" />
    </div>
  )
}
