/**
 * Server-Sent Events (SSE) endpoint for real-time notifications.
 * Clients connect once and receive push updates when new notifications arrive.
 *
 * Usage in Next.js client:
 *   const es = new EventSource('/api/sse/notifications')
 *   es.onmessage = (e) => console.log(JSON.parse(e.data))
 *
 * NOTE: Neon serverless does not support pg_notify LISTEN over connection pool.
 * This implementation uses a 10-second long-poll pattern instead, which works
 * perfectly on Neon + Vercel. For true pg_notify, use a dedicated Postgres
 * connection (Railway/Render postgres, not Neon pooler).
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  let lastChecked = new Date()

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client disconnected
        }
      }

      // Send initial ping + current unread count
      const unread = await prisma.notification.count({
        where: { userId, isRead: false },
      })
      send({ type: 'connected', unreadCount: unread })

      // Poll every 10 seconds for new notifications
      const interval = setInterval(async () => {
        try {
          const newNotifs = await prisma.notification.findMany({
            where: {
              userId,
              createdAt: { gt: lastChecked },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })

          if (newNotifs.length > 0) {
            lastChecked = new Date()
            const totalUnread = await prisma.notification.count({
              where: { userId, isRead: false },
            })
            send({ type: 'new_notifications', notifications: newNotifs, unreadCount: totalUnread })
          } else {
            // Heartbeat to keep connection alive
            send({ type: 'heartbeat', ts: Date.now() })
          }
        } catch {
          clearInterval(interval)
          controller.close()
        }
      }, 10_000)

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',  // Disable Nginx buffering
    },
  })
}
