'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, PackageCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PurchaseOrderStatus } from '@prisma/client'

interface POActionsProps {
  poId:   string
  status: PurchaseOrderStatus
  role:   string
}

export function POActions({ poId, status, role }: POActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState('')

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus)
    setError('')
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Action failed')
        return
      }
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  const isAdmin            = role === 'ADMIN'
  const isWarehouseManager = role === 'WAREHOUSE_MANAGER'
  const isSalesManager     = role === 'SALES_MANAGER'

  const canApprove  = status === 'PENDING'  && (isAdmin || isWarehouseManager)
  const canReceive  = status === 'APPROVED' && (isAdmin || isWarehouseManager)
  const canCancel   = ['PENDING', 'APPROVED'].includes(status) && (isAdmin || isWarehouseManager || isSalesManager)

  if (!canApprove && !canReceive && !canCancel) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <p className="w-full text-xs text-red-600">{error}</p>
      )}

      {canApprove && (
        <Button
          size="sm"
          onClick={() => updateStatus('APPROVED')}
          disabled={loading !== null}
          className="bg-sky-600 hover:bg-sky-700 text-white"
        >
          {loading === 'APPROVED' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
          )}
          Approve
        </Button>
      )}

      {canReceive && (
        <Button
          size="sm"
          onClick={() => updateStatus('RECEIVED')}
          disabled={loading !== null}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading === 'RECEIVED' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <PackageCheck className="h-3.5 w-3.5 mr-1" />
          )}
          Mark Received
        </Button>
      )}

      {canCancel && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => updateStatus('CANCELLED')}
          disabled={loading !== null}
        >
          {loading === 'CANCELLED' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <XCircle className="h-3.5 w-3.5 mr-1" />
          )}
          Cancel Order
        </Button>
      )}
    </div>
  )
}
