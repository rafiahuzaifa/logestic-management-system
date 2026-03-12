import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity:  z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().positive('Unit price must be positive'),
})

const createSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  lineItems:  z.array(lineItemSchema).min(1, 'Add at least one line item'),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status     = searchParams.get('status') ?? ''
  const supplierId = searchParams.get('supplierId') ?? ''
  const search     = searchParams.get('search') ?? ''
  const page       = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit      = 20

  const where: any = {}
  if (status)     where.status = status
  if (supplierId) where.supplierId = supplierId
  if (search)     where.supplier = { name: { contains: search, mode: 'insensitive' } }

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return NextResponse.json({
    purchaseOrders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowedRoles = ['ADMIN', 'WAREHOUSE_MANAGER', 'SALES_MANAGER']
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    const totalAmount = data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    )

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          supplierId:  data.supplierId,
          totalAmount,
          createdById: session.user.id,
          createdAt:   new Date(),
          lineItems: {
            create: data.lineItems.map((item) => ({
              productId: item.productId,
              quantity:  item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          supplier:  { select: { id: true, name: true } },
          lineItems: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      })

      await tx.auditLog.create({
        data: {
          userId:   session.user.id,
          action:   'CREATE',
          entity:   'PurchaseOrder',
          entityId: po.id,
        },
      })

      return po
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
