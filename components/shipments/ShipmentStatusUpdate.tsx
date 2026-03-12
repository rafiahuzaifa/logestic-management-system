'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Edit2, Loader2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

const STATUSES = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED'] as const
type Status = typeof STATUSES[number]

interface Props {
  shipmentId:     string
  currentStatus:  string
}

export function ShipmentStatusUpdate({ shipmentId, currentStatus }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [status, setStatus]   = useState<Status>(currentStatus as Status)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Update failed')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Edit2 className="h-3.5 w-3.5" />Update Status
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold">Update Status</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="space-y-3">
            {STATUSES.map(s => (
              <label key={s} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${status === s ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
                <div className={`h-2 w-2 rounded-full ${s === 'DELIVERED' ? 'bg-emerald-500' : s === 'IN_TRANSIT' ? 'bg-indigo-500' : s === 'DELAYED' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">{s.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : 'Save'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
