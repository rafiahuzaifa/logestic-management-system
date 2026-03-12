'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  salesOrderId:      z.string().min(1, 'Sales order is required'),
  carrierId:         z.string().min(1, 'Carrier is required'),
  trackingNumber:    z.string().optional(),
  estimatedDelivery: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  carriers:    Array<{ id: string; name: string }>
  salesOrders: Array<{ id: string; customer: { name: string } | null }>
}

export function ShipmentForm({ carriers, salesOrders }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        setServerError(body.error ?? 'Failed to create shipment')
        return
      }
      router.push('/shipments')
      router.refresh()
    } catch {
      setServerError('Something went wrong')
    }
  }

  const selectCls = 'flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle className="text-base">Shipment Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salesOrderId">Sales Order *</Label>
              <select id="salesOrderId" {...register('salesOrderId')} className={selectCls}>
                <option value="">Select order…</option>
                {salesOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.id.slice(0, 8).toUpperCase()} — {o.customer?.name ?? 'Unknown'}
                  </option>
                ))}
              </select>
              {errors.salesOrderId && <p className="text-xs text-red-600">{errors.salesOrderId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="carrierId">Carrier *</Label>
              <select id="carrierId" {...register('carrierId')} className={selectCls}>
                <option value="">Select carrier…</option>
                {carriers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.carrierId && <p className="text-xs text-red-600">{errors.carrierId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input id="trackingNumber" placeholder="e.g. 1Z999AA10123456784" {...register('trackingNumber')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimatedDelivery">Estimated Delivery</Label>
              <Input id="estimatedDelivery" type="date" {...register('estimatedDelivery')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Creating…</> : 'Create Shipment'}
        </Button>
      </div>
    </form>
  )
}
