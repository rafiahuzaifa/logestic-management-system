'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  salesOrderId:  z.string().min(1, 'Select a sales order'),
  invoiceNumber: z.string().min(1, 'Invoice number required'),
  companyName:   z.string().optional(),
  billingPeriod: z.string().optional(),
  amount:        z.number().positive('Selling price must be > 0'),
  vendorCost:    z.number().min(0, 'Vendor price must be >= 0'),
  paidStatus:    z.enum(['UNPAID', 'PARTIAL', 'PAID']),
})

type FormData = z.infer<typeof schema>

type SalesOrder = {
  id: string
  customer: { name: string }
  totalAmount: string | number
}

export function InvoiceForm({ salesOrders }: { salesOrders: SalesOrder[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { paidStatus: 'UNPAID', amount: 0, vendorCost: 0 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const amount     = watch('amount') || 0
  const vendorCost = watch('vendorCost') || 0
  const profit     = Number(amount) - Number(vendorCost)

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Failed')
      }
      router.push('/invoices')
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const sel = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Sales Order <span className="text-red-500">*</span></Label>
            <select className={sel} {...register('salesOrderId')}>
              <option value="">Select sales order...</option>
              {salesOrders.map((so) => (
                <option key={so.id} value={so.id}>
                  {so.customer.name} — ${Number(so.totalAmount).toLocaleString()}
                </option>
              ))}
            </select>
            {errors.salesOrderId && <p className="text-xs text-red-500">{errors.salesOrderId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Invoice Number <span className="text-red-500">*</span></Label>
            <Input placeholder="INV-2026-001" {...register('invoiceNumber')} />
            {errors.invoiceNumber && <p className="text-xs text-red-500">{errors.invoiceNumber.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input placeholder="Override company name (optional)" {...register('companyName')} />
          </div>

          <div className="space-y-1.5">
            <Label>Billing Period</Label>
            <Input placeholder="e.g. Jan 2026, Q1 2026" {...register('billingPeriod')} />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Status</Label>
            <select className={sel} {...register('paidStatus')}>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">

          <div className="space-y-1.5">
            <Label>Vendor Price ($)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00"
              {...register('vendorCost', { valueAsNumber: true })} />
            {errors.vendorCost && <p className="text-xs text-red-500">{errors.vendorCost.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Selling Price ($) <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" min="0.01" placeholder="0.00"
              {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Profit (auto-calculated)</Label>
            <div className={`flex h-9 items-center rounded-md border px-3 text-sm font-semibold ${
              profit >= 0
                ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                : 'text-red-600 border-red-200 bg-red-50'
            }`}>
              ${profit.toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Create Invoice'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
