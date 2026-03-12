import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [warehouses, products] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, warehouseLocation: true, currentStock: true, price: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return NextResponse.json({ warehouses, productCount: products.length })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  try {
    const warehouse = await prisma.warehouse.create({ data: { name: name.trim(), description: description || null } })
    return NextResponse.json(warehouse, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
