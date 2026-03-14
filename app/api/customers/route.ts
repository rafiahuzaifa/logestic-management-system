import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: { _count: { select: { salesOrders: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(customers)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const b = await req.json()
    const customer = await prisma.customer.create({
      data: {
        name:          b.name,
        email:         b.email,
        phone:         b.phone         || null,
        address:       b.address       || null,
        city:          b.city          || null,
        country:       b.country       || null,
        website:       b.website       || null,
        contactPerson: b.contactPerson || null,
        companyType:   b.companyType   || null,
        taxId:         b.taxId         || null,
        creditLimit:   b.creditLimit   ? Number(b.creditLimit) : null,
        notes:         b.notes         || null,
      },
    })
    return NextResponse.json(customer, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
