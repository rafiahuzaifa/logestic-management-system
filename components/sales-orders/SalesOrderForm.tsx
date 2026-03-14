'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Customer = { id: string; name: string }
type Product  = { id: string; name: string; sku: string; price: string; unit: string }

type LineItem = { productId: string; quantity: number; unitPrice: number }

const sel = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#387dff]'

export function SalesOrderForm({ customers, products }: { customers: Customer[]; products: Product[] }) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [status,     setStatus]     = useState('DRAFT')
  const [lines,      setLines]      = useState<LineItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const addLine = () => setLines([...lines, { productId: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lines]
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value)
      updated[i] = { ...updated[i], productId: String(value), unitPrice: prod ? Number(prod.price) : 0 }
    } else {
      updated[i] = { ...updated[i], [field]: Number(value) }
    }
    setLines(updated)
  }

  const total = lines.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0)

  const handleSubmit = async () => {
    if (!customerId) { setError('Select a customer'); return }
    if (lines.some((l) => !l.productId)) { setError('All line items need a product'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, status, lineItems: lines }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      router.push('/sales-orders')
      router.refresh()
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Customer <span className="text-red-500">*</span></Label>
            <select className={sel} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5 space-y-1">
                {i === 0 && <Label className="text-xs">Product</Label>}
                <select className={sel} value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                {i === 0 && <Label className="text-xs">Qty</Label>}
                <Input type="number" min="1" value={line.quantity}
                  onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
              </div>
              <div className="col-span-3 space-y-1">
                {i === 0 && <Label className="text-xs">Unit Price ($)</Label>}
                <Input type="number" step="0.01" value={line.unitPrice}
                  onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} />
              </div>
              <div className="col-span-1 space-y-1">
                {i === 0 && <Label className="text-xs">Sub</Label>}
                <p className="h-9 flex items-center text-xs font-semibold text-gray-700">
                  {formatCurrency(line.quantity * line.unitPrice)}
                </p>
              </div>
              <div className="col-span-1">
                {lines.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-500"
                    onClick={() => removeLine(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-end">
            <p className="text-sm font-bold">Total: <span className="text-[#387dff]">{formatCurrency(total)}</span></p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={saving} className="bg-[#387dff] hover:bg-[#2563eb]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Create Order'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  )
}
