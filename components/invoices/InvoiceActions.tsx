'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil, Trash2, X, Loader2 } from 'lucide-react'

type Invoice = {
  id: string
  invoiceNumber: string
  companyName: string | null
  billingPeriod: string | null
  amount: string
  vendorCost: string | null
  paidStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
}

export function InvoiceActions({ inv }: { inv: Invoice }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  // Edit form state
  const [companyName,   setCompanyName]   = useState(inv.companyName   ?? '')
  const [billingPeriod, setBillingPeriod] = useState(inv.billingPeriod ?? '')
  const [amount,        setAmount]        = useState(inv.amount)
  const [vendorCost,    setVendorCost]    = useState(inv.vendorCost    ?? '')
  const [paidStatus,    setPaidStatus]    = useState(inv.paidStatus)

  const profit = Number(amount || 0) - Number(vendorCost || 0)

  const handleEdit = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName:   companyName   || null,
          billingPeriod: billingPeriod || null,
          amount:        Number(amount),
          vendorCost:    vendorCost ? Number(vendorCost) : null,
          paidStatus,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setEditOpen(false)
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await fetch(`/api/invoices/${inv.id}`, { method: 'DELETE' })
      setDelOpen(false)
      router.refresh()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const sel = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="flex items-center gap-1">
      {/* Edit */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Trigger asChild>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-semibold">Edit Invoice {inv.invoiceNumber}</Dialog.Title>
              <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Company Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
              </div>
              <div className="space-y-1">
                <Label>Billing Period</Label>
                <Input value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value)} placeholder="e.g. Jan 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Vendor Price ($)</Label>
                  <Input type="number" step="0.01" value={vendorCost} onChange={(e) => setVendorCost(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Selling Price ($)</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <div className="rounded-md border px-3 py-2 text-sm">
                Profit: <span className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${profit.toFixed(2)}</span>
              </div>
              <div className="space-y-1">
                <Label>Payment Status</Label>
                <select className={sel} value={paidStatus} onChange={(e) => setPaidStatus(e.target.value as Invoice['paidStatus'])}>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button onClick={handleEdit} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete */}
      <Dialog.Root open={delOpen} onOpenChange={setDelOpen}>
        <Dialog.Trigger asChild>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            <Dialog.Title className="text-base font-semibold mb-2">Delete Invoice</Dialog.Title>
            <p className="text-sm text-gray-500 mb-5">
              Delete <strong>{inv.invoiceNumber}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDelete} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </Button>
              <Button variant="outline" onClick={() => setDelOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
