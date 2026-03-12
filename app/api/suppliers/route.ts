import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters'),
  email:        z.string().email('Invalid email address'),
  phone:        z.string().optional(),
  address:      z.string().optional(),
  rating:       z.number().min(0, 'Rating must be 0 or higher').max(5, 'Rating cannot exceed 5'),
  leadTimeDays: z.number().int().positive('Lead time must be a positive integer'),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''

  const where = search
    ? {
        OR: [
          { name:    { contains: search, mode: 'insensitive' as const } },
          { email:   { contains: search, mode: 'insensitive' as const } },
          { phone:   { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { purchaseOrders: true } },
    },
  })

  return NextResponse.json({ suppliers })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'WAREHOUSE_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    const existing = await prisma.supplier.findUnique({ where: { email: data.email } })
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

    const supplier = await prisma.supplier.create({ data })

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: 'CREATE', entity: 'Supplier', entityId: supplier.id },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
