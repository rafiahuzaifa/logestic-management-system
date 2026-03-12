import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  eventType:  z.string().min(1, 'Event type is required'),
  emailTo:    z.string().email('Invalid email'),
  threshold:  z.number().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const watchers = await prisma.watcher.findMany({
      where:   { userId: session.user.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { id: 'desc' },
    })
    return NextResponse.json(watchers)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch watchers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
    }
    const watcher = await prisma.watcher.create({
      data: {
        ...parsed.data,
        threshold: parsed.data.threshold ?? null,
        userId:    session.user.id,
        isActive:  true,
      },
    })
    return NextResponse.json(watcher, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create watcher' }, { status: 500 })
  }
}
