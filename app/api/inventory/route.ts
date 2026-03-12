import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name:              z.string().min(2),
  sku:               z.string().min(1),
  categoryId:        z.string().min(1),
  unit:              z.string().min(1),
  price:             z.number().positive(),
  reorderLevel:      z.number().int().min(0),
  currentStock:      z.number().int().min(0).default(0),
  warehouseLocation: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const search     = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const lowStock   = searchParams.get('lowStock') === 'true'
  const page       = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit      = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))

  const where: any = {}
  if (search)     where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }]
  if (categoryId) where.categoryId = categoryId

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  // Apply lowStock filter in JS (column comparison)
  const filtered = lowStock ? products.filter((p) => p.currentStock <= p.reorderLevel) : products

  return NextResponse.json({
    products: filtered,
    total: lowStock ? filtered.length : total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    categories,
  })
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

    const existing = await prisma.product.findUnique({ where: { sku: data.sku } })
    if (existing) return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })

    const product = await prisma.product.create({
      data: { ...data, price: data.price },
      include: { category: { select: { id: true, name: true } } },
    })

    // Record initial stock movement
    if (data.currentStock > 0) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: 'IN', quantity: data.currentStock, reference: 'Initial stock' },
      })
    }

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: 'CREATE', entity: 'Product', entityId: product.id },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
