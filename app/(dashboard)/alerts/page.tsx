import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertsClient } from '@/components/alerts/AlertsClient'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [watchers, emailLogs, recentNotifications, inquiries] = await Promise.all([
    prisma.watcher.findMany({
      where:   { userId: session.user.id },
      orderBy: { id: 'desc' },
    }),
    prisma.emailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 20,
    }),
    prisma.notification.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    // service_inquiries from email poller (raw SQL — table created by FastAPI backend)
    prisma.$queryRaw<any[]>`
      SELECT id, inquiry_type, customer_name, phone, location,
             service_details, status, urgency, is_query,
             raw_subject, raw_from, created_at
      FROM   service_inquiries
      ORDER  BY created_at DESC
      LIMIT  30
    `.catch(() => [] as any[]),
  ])

  const activeWatchers = watchers.filter(w => w.isActive).length
  const sentEmails     = emailLogs.filter(e => e.status === 'sent').length
  const unreadNotifs   = recentNotifications.filter(n => !n.isRead).length

  return (
    <AlertsClient
      initialWatchers={watchers.map(w => ({
        id:         w.id,
        entityType: w.entityType,
        eventType:  w.eventType,
        emailTo:    w.emailTo,
        threshold:  w.threshold ? Number(w.threshold) : null,
        isActive:   w.isActive,
      }))}
      emailLogs={emailLogs.map(l => ({
        id:      l.id,
        to:      l.to,
        subject: l.subject,
        status:  l.status,
        sentAt:  l.sentAt.toISOString(),
      }))}
      notifications={recentNotifications.map(n => ({
        id:         n.id,
        title:      n.title,
        message:    n.message,
        type:       String(n.type),
        entityType: n.entityType,
        entityId:   n.entityId,
        isRead:     n.isRead,
        createdAt:  n.createdAt.toISOString(),
      }))}
      inquiries={inquiries.map((i: any) => ({
        id:              i.id,
        inquiry_type:    i.inquiry_type,
        customer_name:   i.customer_name,
        phone:           i.phone,
        location:        i.location,
        service_details: i.service_details,
        status:          i.status,
        urgency:         i.urgency,
        is_query:        i.is_query,
        raw_subject:     i.raw_subject,
        raw_from:        i.raw_from,
        created_at:      i.created_at instanceof Date ? i.created_at.toISOString() : String(i.created_at),
      }))}
      stats={{
        totalWatchers:  watchers.length,
        activeWatchers,
        sentEmails,
        unreadNotifs,
        totalInquiries: inquiries.length,
      }}
    />
  )
}
