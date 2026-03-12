'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Pencil, Trash2, X, Loader2, Warehouse } from 'lucide-react'

type WH = { id: string; name: string; description: string | null }

function AddModal({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setOpen(false); setName(''); setDesc('')
      onDone()
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Add Warehouse</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">Add Warehouse</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Location Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse A, Zone-1" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleAdd} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Create'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditModal({ wh, onDone }: { wh: WH; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(wh.name)
  const [desc, setDesc] = useState(wh.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleEdit = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/warehouses/${wh.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setOpen(false)
      onDone()
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">Edit Warehouse</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Location Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleEdit} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteModal({ wh, onDone }: { wh: WH; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleDelete = async () => {
    setSaving(true)
    try {
      await fetch(`/api/warehouses/${wh.id}`, { method: 'DELETE' })
      setOpen(false)
      onDone()
    } finally { setSaving(false) }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
          <Dialog.Title className="text-base font-semibold mb-2">Delete Warehouse</Dialog.Title>
          <p className="text-sm text-gray-500 mb-5">
            Delete <strong>{wh.name}</strong>? All products in this warehouse will be moved to <em>Unassigned</em>.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function WarehouseManager({ warehouses: initial }: { warehouses: WH[] }) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Managed Warehouses</h2>
        </div>
        <AddModal onDone={refresh} />
      </div>

      {initial.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No warehouses yet. Add one to get started.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {initial.map((wh) => (
            <div key={wh.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{wh.name}</p>
                {wh.description && <p className="text-xs text-gray-400 truncate">{wh.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <EditModal wh={wh} onDone={refresh} />
                <DeleteModal wh={wh} onDone={refresh} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
