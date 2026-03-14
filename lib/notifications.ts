import { prisma } from './prisma'
import { NotificationType } from '@prisma/client'

type CreateNotifInput = {
  title: string
  message: string
  type: NotificationType
  entityType?: string
  entityId?: string
  roles: string[]
}

/**
 * Creates in-app notifications for all users with the given roles.
 */
export async function createNotifications({
  title,
  message,
  type,
  entityType,
  entityId,
  roles,
}: CreateNotifInput) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: roles as any[] } },
      select: { id: true },
    })
    if (!users.length) return

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        type,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        isRead: false,
      })),
    })
  } catch (err) {
    // Notification failures should never break the main flow
    console.error('[Notifications]', err)
  }
}
