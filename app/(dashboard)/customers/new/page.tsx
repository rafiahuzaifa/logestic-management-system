import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CustomerForm } from '@/components/customers/CustomerForm'

export const dynamic = 'force-dynamic'

export default async function NewCustomerPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">New Customer</h1>
        <p className="text-sm text-gray-500">Add a new customer to the system</p>
      </div>
      <CustomerForm />
    </div>
  )
}
