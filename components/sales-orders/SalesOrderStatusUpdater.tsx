'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2 } from 'lucide-react'

const STATUSES = ['DRAFT', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const
type Status = typeof STATUSES[number]

export function SalesOrderStatusUpdater({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>(currentStatus as Status)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/sales-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setOpen(false)
      router.refresh()
    } finally { setSaving(false) }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline">Update Status</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">Update Order Status</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  status === s
                    ? 'border-[#387dff] bg-[#387dff] text-white'
                    : 'border-gray-200 hover:border-[#387dff] hover:text-[#387dff]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#387dff] hover:bg-[#2563eb]">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
