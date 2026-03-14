import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProfileEditor } from '@/components/settings/ProfileEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!user) redirect('/login')

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin', WAREHOUSE_MANAGER: 'Warehouse Manager',
    SALES_MANAGER: 'Sales Manager', LOGISTICS_OFFICER: 'Logistics Officer', VIEWER: 'Viewer',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile and account preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProfileEditor user={{ id: user.id, name: user.name, email: user.email, role: user.role }} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Account</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Role</span>
                <Badge variant="default">{roleLabel[user.role] ?? user.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member since</span>
                <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Auth</span>
                <span className="font-medium">JWT Session</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">System</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['App',        'Sharptel LSM'],
                ['Framework',  'Next.js 16'],
                ['Database',   'Neon PostgreSQL'],
                ['ORM',        'Prisma 7'],
                ['Deployment', 'Vercel'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
