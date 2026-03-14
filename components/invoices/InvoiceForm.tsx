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
  currency:      z.string().optional(),
  vendorCost:    z.number().min(0),
  subtotal:      z.number().min(0).optional(),
  taxRate:       z.number().min(0).max(100).optional(),
  amount:        z.number().positive('Selling price must be > 0'),
  paidStatus:    z.enum(['UNPAID', 'PARTIAL', 'PAID']),
  dueDate:       z.string().optional(),
  paymentMethod: z.string().optional(),
  notes:         z.string().optional(),
})

type FormData = z.infer<typeof schema>

type SalesOrder = {
  id: string
  customer: { name: string }
  totalAmount: string | number
}

const sel = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export function InvoiceForm({ salesOrders }: { salesOrders: SalesOrder[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { paidStatus: 'UNPAID', amount: 0, vendorCost: 0, currency: 'USD', taxRate: 0 },
    resolver: zodResolver(schema) as any,
  })

  const amount     = watch('amount')    || 0
  const vendorCost = watch('vendorCost')|| 0
  const subtotal   = watch('subtotal')  || 0
  const taxRate    = watch('taxRate')   || 0
  const taxAmount  = subtotal > 0 ? Number(subtotal) * Number(taxRate) / 100 : 0
  const profit     = Number(amount) - Number(vendorCost)

  const onSubmit = async (data: FormData) => {
    setSaving(true); setError('')
    try {
      const payload = {
        ...data,
        taxAmount: data.subtotal ? (Number(data.subtotal) * (data.taxRate ?? 0) / 100) : undefined,
      }
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      router.push('/invoices')
      router.refresh()
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

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
            <Label>Currency</Label>
            <select className={sel} {...register('currency')}>
              <option value="USD">USD – US Dollar</option>
              <option value="PKR">PKR – Pakistani Rupee</option>
              <option value="EUR">EUR – Euro</option>
              <option value="GBP">GBP – British Pound</option>
              <option value="AED">AED – UAE Dirham</option>
              <option value="SAR">SAR – Saudi Riyal</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input placeholder="Override billing company (optional)" {...register('companyName')} />
          </div>

          <div className="space-y-1.5">
            <Label>Billing Period</Label>
            <Input placeholder="e.g. Jan 2026, Q1 2026" {...register('billingPeriod')} />
          </div>

          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" {...register('dueDate')} />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Status</Label>
            <select className={sel} {...register('paidStatus')}>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <select className={sel} {...register('paymentMethod')}>
              <option value="">Not specified</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Online">Online Payment</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing & Tax</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">

          <div className="space-y-1.5">
            <Label>Vendor / Cost Price</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00"
              {...register('vendorCost', { valueAsNumber: true })} />
          </div>

          <div className="space-y-1.5">
            <Label>Subtotal (before tax)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00"
              {...register('subtotal', { valueAsNumber: true })} />
          </div>

          <div className="space-y-1.5">
            <Label>Tax Rate (%)</Label>
            <Input type="number" step="0.01" min="0" max="100" placeholder="0"
              {...register('taxRate', { valueAsNumber: true })} />
            {subtotal > 0 && (
              <p className="text-xs text-gray-500">Tax amount: ${taxAmount.toFixed(2)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Total Amount <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" min="0.01" placeholder="0.00"
              {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <div className={`flex h-10 items-center justify-between rounded-lg border px-4 text-sm font-semibold ${
              profit >= 0 ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-red-700 border-red-200 bg-red-50'
            }`}>
              <span>Gross Profit</span>
              <span>${profit.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent>
          <textarea
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Internal notes or terms..."
            {...register('notes')}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="bg-[#387dff] hover:bg-[#2563eb]">
          {saving ? 'Saving...' : 'Create Invoice'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
