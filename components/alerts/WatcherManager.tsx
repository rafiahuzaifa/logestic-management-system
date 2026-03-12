'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2, X, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

const schema = z.object({
  entityType: z.string().min(1, 'Entity type required'),
  eventType:  z.string().min(1, 'Event type required'),
  emailTo:    z.string().email('Invalid email'),
  threshold:  z.number().optional(),
})
type FormData = z.infer<typeof schema>

interface Watcher {
  id:         string
  entityType: string
  eventType:  string
  emailTo:    string
  threshold:  number | null
  isActive:   boolean
}

const ENTITY_TYPES = ['product', 'purchase_order', 'shipment', 'sales_order']
const EVENT_TYPES  = ['low_stock', 'status_change', 'delayed', 'overdue', 'created']

export function WatcherManager({ initialWatchers }: { initialWatchers: Watcher[] }) {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [watchers, setWatchers]       = useState<Watcher[]>(initialWatchers)
  const [serverError, setServerError] = useState('')
  const [deleting, setDeleting]       = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { threshold: undefined },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await fetch('/api/watchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        setServerError(body.error ?? 'Failed to create watcher')
        return
      }
      const newWatcher = await res.json()
      setWatchers(prev => [newWatcher, ...prev])
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      setServerError('Something went wrong')
    }
  }

  const deleteWatcher = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/watchers/${id}`, { method: 'DELETE' })
      setWatchers(prev => prev.filter(w => w.id !== id))
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/watchers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    if (res.ok) {
      setWatchers(prev => prev.map(w => w.id === id ? { ...w, isActive: !isActive } : w))
    }
  }

  const selectCls = 'flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{watchers.length} watcher{watchers.length !== 1 ? 's' : ''} configured</p>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Watcher</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-base font-semibold">New Watcher</Dialog.Title>
                <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {serverError && <p className="text-sm text-red-600">{serverError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="entityType">Entity</Label>
                    <select id="entityType" {...register('entityType')} className={selectCls}>
                      <option value="">Select…</option>
                      {ENTITY_TYPES.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                    {errors.entityType && <p className="text-xs text-red-600">{errors.entityType.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eventType">Event</Label>
                    <select id="eventType" {...register('eventType')} className={selectCls}>
                      <option value="">Select…</option>
                      {EVENT_TYPES.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                    {errors.eventType && <p className="text-xs text-red-600">{errors.eventType.message}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emailTo">Notify Email</Label>
                  <Input id="emailTo" type="email" placeholder="alerts@company.com" {...register('emailTo')} />
                  {errors.emailTo && <p className="text-xs text-red-600">{errors.emailTo.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="threshold">Threshold (optional)</Label>
                  <Input id="threshold" type="number" step="0.01" placeholder="e.g. 10 for stock below 10" {...register('threshold', { valueAsNumber: true })} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reset() }}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Creating…</> : 'Create Watcher'}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {watchers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center text-gray-400">
          <p className="text-sm">No watchers configured yet. Add one to receive email alerts.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
          {watchers.map(w => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${w.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {w.entityType.replace('_', ' ')} → {w.eventType.replace('_', ' ')}
                    {w.threshold != null && <span className="text-gray-500"> (threshold: {w.threshold})</span>}
                  </p>
                  <p className="text-xs text-gray-500">{w.emailTo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(w.id, w.isActive)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${w.isActive ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400' : 'border-gray-300 text-gray-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'}`}
                >
                  {w.isActive ? 'Active' : 'Paused'}
                </button>
                <button
                  onClick={() => deleteWatcher(w.id)}
                  disabled={deleting === w.id}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  {deleting === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
