import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Mail, Zap } from 'lucide-react'
import { WatcherManager } from '@/components/alerts/WatcherManager'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const watchers = await prisma.watcher.findMany({
    where:   { userId: session.user.id },
    orderBy: { id: 'desc' },
  })

  const emailLogs = await prisma.emailLog.findMany({
    orderBy: { sentAt: 'desc' },
    take:    10,
  })

  const activeCount = watchers.filter(w => w.isActive).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Alerts & Watchers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure email alerts for logistics events</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Watchers', value: watchers.length,                          icon: Bell,  color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-950/40'  },
          { label: 'Active',         value: activeCount,                              icon: Zap,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Emails Sent',    value: emailLogs.filter(e => e.status === 'sent').length, icon: Mail,  color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/40'    },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">My Watchers</CardTitle></CardHeader>
            <CardContent>
              <WatcherManager initialWatchers={watchers.map(w => ({
                id:         w.id,
                entityType: w.entityType,
                eventType:  w.eventType,
                emailTo:    w.emailTo,
                threshold:  w.threshold ? Number(w.threshold) : null,
                isActive:   w.isActive,
              }))} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Email Logs</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {emailLogs.length === 0 ? (
                <p className="text-sm text-gray-400">No emails sent yet</p>
              ) : (
                emailLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${log.status === 'sent' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{log.subject}</p>
                      <p className="text-gray-500">{log.to}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
