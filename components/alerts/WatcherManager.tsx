'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2, X, Trash2, Bell, BellOff } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

const schema = z.object({
  entityType: z.string().min(1, 'Entity type required'),
  eventType:  z.string().min(1, 'Event type required'),
  emailTo:    z.string().email('Invalid email'),
  threshold:  z.number().optional(),
})
type FormData = z.infer<typeof schema>

interface Watcher {
  id: string; entityType: string; eventType: string
  emailTo: string; threshold: number | null; isActive: boolean
}

const ENTITIES = [
  { value: 'product',        label: '📦 Product',        events: [{ value: 'low_stock', label: 'Low Stock', hasThreshold: true }, { value: 'created', label: 'New Product Added' }] },
  { value: 'shipment',       label: '🚚 Shipment',       events: [{ value: 'delayed', label: 'Shipment Delayed' }, { value: 'status_change', label: 'Status Changed' }, { value: 'created', label: 'New Shipment Created' }] },
  { value: 'sales_order',    label: '🛒 Sales Order',    events: [{ value: 'created', label: 'New Order Created' }, { value: 'status_change', label: 'Status Changed' }] },
  { value: 'purchase_order', label: '📋 Purchase Order', events: [{ value: 'created', label: 'New PO Created' }, { value: 'status_change', label: 'Status Changed' }] },
  { value: 'invoice',        label: '🧾 Invoice',        events: [{ value: 'created', label: 'Invoice Created' }, { value: 'overdue', label: 'Invoice Overdue' }, { value: 'paid', label: 'Invoice Paid' }] },
]

const sel = 'flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#387dff] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

export function WatcherManager({ initialWatchers }: { initialWatchers: Watcher[] }) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [watchers, setWatchers] = useState<Watcher[]>(initialWatchers)
  const [serverError, setErr]   = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  const entityVal         = watch('entityType')
  const entityObj         = ENTITIES.find(e => e.value === entityVal)
  const eventVal          = watch('eventType')
  const eventObj          = entityObj?.events.find(ev => ev.value === eventVal)

  const onEntityChange = (v: string) => { setValue('entityType', v); setValue('eventType', '') }

  const onSubmit = async (data: FormData) => {
    setErr('')
    const res = await fetch('/api/watchers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) { setErr((await res.json()).error ?? 'Failed'); return }
    const newW = await res.json()
    setWatchers(p => [newW, ...p])
    setOpen(false); reset(); router.refresh()
  }

  const del = async (id: string) => {
    setDeleting(id)
    await fetch(`/api/watchers/${id}`, { method: 'DELETE' })
    setWatchers(p => p.filter(w => w.id !== id))
    setDeleting(null)
  }

  const toggle = async (id: string, cur: boolean) => {
    const res = await fetch(`/api/watchers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !cur }) })
    if (res.ok) setWatchers(p => p.map(w => w.id === id ? { ...w, isActive: !cur } : w))
  }

  const eLabel = (v: string) => ENTITIES.find(e => e.value === v)?.label ?? v
  const evLabel = (en: string, ev: string) => ENTITIES.find(e => e.value === en)?.events.find(e => e.value === ev)?.label ?? ev

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{watchers.length} watcher{watchers.length !== 1 ? 's' : ''}</p>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button size="sm" className="gap-1.5 bg-[#387dff] hover:bg-[#2563eb]"><Plus className="h-3.5 w-3.5" />Add Watcher</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <Dialog.Title className="text-base font-semibold">New Email Watcher</Dialog.Title>
                  <p className="text-xs text-gray-500 mt-0.5">Get email when this event happens</p>
                </div>
                <Dialog.Close className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></Dialog.Close>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{serverError}</p>}

                <div className="space-y-1.5">
                  <Label>Watch Entity</Label>
                  <select className={sel} value={entityVal || ''} onChange={e => onEntityChange(e.target.value)}>
                    <option value="">Select what to watch…</option>
                    {ENTITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                  <input type="hidden" {...register('entityType')} />
                  {errors.entityType && <p className="text-xs text-red-600">{errors.entityType.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>When this happens</Label>
                  <select className={sel} {...register('eventType')} disabled={!entityVal}>
                    <option value="">Select event…</option>
                    {entityObj?.events.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                  </select>
                  {errors.eventType && <p className="text-xs text-red-600">{errors.eventType.message}</p>}
                </div>

                {(eventObj as any)?.hasThreshold && (
                  <div className="space-y-1.5">
                    <Label>Stock Threshold <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                    <Input type="number" step="1" min="0" placeholder="e.g. 10 — alert only if stock ≤ this" {...register('threshold', { valueAsNumber: true })} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Send alert to email</Label>
                  <Input type="email" placeholder="manager@sharptel.pk" {...register('emailTo')} />
                  {errors.emailTo && <p className="text-xs text-red-600">{errors.emailTo.message}</p>}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reset() }}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-[#387dff] hover:bg-[#2563eb]" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Creating…</> : 'Create Watcher'}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {watchers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center">
          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No watchers yet</p>
          <p className="text-xs text-gray-400 mt-1">Add a watcher to get email alerts for any LSM event</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {watchers.map(w => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <div className={`h-2 w-2 rounded-full shrink-0 ${w.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {eLabel(w.entityType)} → <span className="text-[#387dff]">{evLabel(w.entityType, w.eventType)}</span>
                  {w.threshold != null && <span className="text-gray-400 font-normal text-xs"> (≤{w.threshold})</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">✉ {w.emailTo}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggle(w.id, w.isActive)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${w.isActive ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400' : 'border-gray-300 text-gray-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'}`}>
                  {w.isActive ? <><Bell className="h-2.5 w-2.5" /> Active</> : <><BellOff className="h-2.5 w-2.5" /> Paused</>}
                </button>
                <button onClick={() => del(w.id)} disabled={deleting === w.id} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                  {deleting === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
