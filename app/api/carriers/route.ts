import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  name:          z.string().min(2, 'Name must be at least 2 characters'),
  contactPerson: z.string().optional(),
  phone:         z.string().optional(),
  email:         z.string().email().optional().or(z.literal('')),
})

export async function GET() {
  try {
    const carriers = await prisma.carrier.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(carriers)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch carriers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!['ADMIN', 'LOGISTICS_OFFICER'].includes(session?.user?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
    }
    const carrier = await prisma.carrier.create({
      data: { ...parsed.data, email: parsed.data.email || null },
    })
    return NextResponse.json(carrier, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create carrier' }, { status: 500 })
  }
}
