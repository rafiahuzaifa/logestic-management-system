import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16">
        <div className="px-6 py-4 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <Breadcrumbs />
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
