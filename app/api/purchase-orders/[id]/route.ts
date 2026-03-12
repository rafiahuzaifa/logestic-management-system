import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['APPROVED', 'RECEIVED', 'CANCELLED']),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier:  true,
      createdBy: { select: { id: true, name: true, email: true } },
      lineItems: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
      grns: {
        include: {
          receivedBy: { select: { id: true, name: true } },
        },
        orderBy: { receivedAt: 'desc' },
      },
    },
  })

  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(po)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const role = session.user.role

  try {
    const body = await req.json()
    const { status: newStatus } = patchSchema.parse(body)

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lineItems: true },
    })

    if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })

    // Validate transitions
    if (newStatus === 'APPROVED') {
      if (po.status !== 'PENDING') {
        return NextResponse.json({ error: 'Only PENDING orders can be approved' }, { status: 400 })
      }
      if (!['ADMIN', 'WAREHOUSE_MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (newStatus === 'RECEIVED') {
      if (po.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Only APPROVED orders can be marked received' }, { status: 400 })
      }
      if (!['ADMIN', 'WAREHOUSE_MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (newStatus === 'CANCELLED') {
      if (!['PENDING', 'APPROVED'].includes(po.status)) {
        return NextResponse.json({ error: 'Cannot cancel a received order' }, { status: 400 })
      }
      if (!['ADMIN', 'WAREHOUSE_MANAGER', 'SALES_MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (newStatus === 'RECEIVED') {
      // Use transaction: update PO, create GRN, update stock, record movements
      const updated = await prisma.$transaction(async (tx) => {
        const updatedPo = await tx.purchaseOrder.update({
          where: { id },
          data:  { status: 'RECEIVED' },
        })

        // Create GRN
        await tx.gRN.create({
          data: {
            purchaseOrderId: id,
            receivedById:    session.user.id,
            receivedAt:      new Date(),
          },
        })

        // Update product stock for each line item
        for (const item of po.lineItems) {
          await tx.product.update({
            where: { id: item.productId },
            data:  { currentStock: { increment: item.quantity } },
          })

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type:      'IN',
              quantity:  item.quantity,
              reference: `PO-${id.slice(0, 8).toUpperCase()}`,
            },
          })
        }

        await tx.auditLog.create({
          data: {
            userId:   session.user.id,
            action:   'RECEIVE',
            entity:   'PurchaseOrder',
            entityId: id,
          },
        })

        return updatedPo
      })

      return NextResponse.json(updated)
    }

    // For APPROVED or CANCELLED (no stock changes)
    const updated = await prisma.$transaction(async (tx) => {
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data:  { status: newStatus },
      })

      await tx.auditLog.create({
        data: {
          userId:   session.user.id,
          action:   newStatus,
          entity:   'PurchaseOrder',
          entityId: id,
        },
      })

      return updatedPo
    })

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
