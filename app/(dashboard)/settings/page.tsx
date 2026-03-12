import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Shield, Database, Bell, Palette } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and application preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{session.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{session.user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Role</span>
              <Badge variant="default">{session.user?.role}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Authentication</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">NextAuth v4 + JWT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Session Strategy</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">JWT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Password Hashing</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">bcrypt (12 rounds)</span>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-600" />Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ORM</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Prisma 7</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Database</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Provider</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Neon (Serverless)</span>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Email Alerts</span>
              <Badge variant="secondary">Configure in Alerts</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Low Stock Alerts</span>
              <Badge variant="warning">Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Shipment Updates</span>
              <Badge variant="default">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet-600" />Application
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              ['Framework',   'Next.js 16'],
              ['UI',          'Tailwind CSS v4'],
              ['Charts',      'Recharts'],
              ['State',       'React Query + Zustand'],
              ['Auth',        'NextAuth v4'],
              ['Forms',       'React Hook Form + Zod'],
              ['Icons',       'Lucide React'],
              ['Deployment',  'Vercel'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-gray-500">{label}</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
