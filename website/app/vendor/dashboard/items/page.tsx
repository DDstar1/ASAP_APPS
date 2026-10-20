'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Loader2, X, ImageIcon, Search, Package, AlertTriangle, Ruler } from 'lucide-react'
import { getVendorItems, getVendorCategories, insertItem, updateItem, deleteItem, updateItemStock, uploadItemImage } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import type { ItemRow, MenuRow } from '@/lib/supabase'

type ItemForm = {
  name: string; price: string; stock: string; menu_id: string; imageFile: File | null; imagePreview: string
  weight_kg: string; length_cm: string; width_cm: string; height_cm: string
}
const emptyForm: ItemForm = {
  name: '', price: '', stock: '', menu_id: '', imageFile: null, imagePreview: '',
  weight_kg: '', length_cm: '', width_cm: '', height_cm: '',
}

const MAX_WEIGHT_KG = 50

const SIZE_FIELDS = [
  { key: 'length_cm', label: 'Length', max: 300 },
  { key: 'width_cm', label: 'Width', max: 300 },
  { key: 'height_cm', label: 'Height', max: 300 },
] as const

function formatNaira(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

export default function ItemsPage() {
  const { vendor } = useVendor()
  const [items, setItems] = useState<ItemRow[]>([])
  const [categories, setCategories] = useState<MenuRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!vendor) return
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor])

  async function load() {
    const [itemsRes, catRes] = await Promise.all([
      getVendorItems(vendor!.id),
      getVendorCategories(vendor!.id),
    ])
    setItems(itemsRes.data || [])
    setCategories(catRes.data || [])
    setLoading(false)
  }

  function openAdd() { setEditing(null); setForm(emptyForm); setError(''); setModalOpen(true) }

  function openEdit(item: ItemRow) {
    setEditing(item)
    // An estimated size is left blank so the vendor has to measure it
    const str = (n: number) => (item.size_estimated ? '' : String(n))
    setForm({
      name: item.name, price: String(item.price), stock: String(item.stock), menu_id: String(item.menu_id ?? ''),
      imageFile: null, imagePreview: item.image_url ?? '',
      weight_kg: str(item.weight_kg), length_cm: str(item.length_cm), width_cm: str(item.width_cm), height_cm: str(item.height_cm),
    })
    setError('')
    setModalOpen(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((f) => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file) }))
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault()
    const weight = parseFloat(form.weight_kg)
    const dims = SIZE_FIELDS.map(({ key }) => parseFloat(form[key]))
    if (!(weight > 0 && weight <= MAX_WEIGHT_KG)) { setError(`Enter the packed weight in kg (up to ${MAX_WEIGHT_KG}).`); return }
    if (dims.some((d) => !(d > 0 && d <= 300))) { setError('Enter the packed length, width and height in cm (up to 300 each).'); return }
    setSaving(true)
    setError('')

    let image_url = editing?.image_url ?? null
    if (form.imageFile) {
      const url = await uploadItemImage(vendor!.id, form.imageFile, form.name)
      if (!url) { setError('Image upload failed.'); setSaving(false); return }
      image_url = url
    }

    const payload = {
      vendor_id: vendor!.id,
      name: form.name,
      price: Math.round(parseFloat(form.price) * 100),
      stock: parseInt(form.stock),
      menu_id: form.menu_id ? parseInt(form.menu_id) : null,
      image_url,
      weight_kg: Math.round(weight * 100) / 100,
      length_cm: Math.round(dims[0] * 10) / 10,
      width_cm: Math.round(dims[1] * 10) / 10,
      height_cm: Math.round(dims[2] * 10) / 10,
      size_estimated: false,
    }

    const { error: err } = editing
      ? await updateItem(editing.id, payload)
      : await insertItem(payload as Omit<ItemRow, 'id'>)

    if (err) { setError(err.message); setSaving(false); return }
    await load()
    setModalOpen(false)
    setSaving(false)
  }

  async function handleDelete(id: number) {
    await deleteItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleteId(null)
  }

  async function handleUpdateStock(id: number, delta: number) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const newStock = Math.max(0, item.stock + delta)
    await updateItemStock(id, newStock)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stock: newStock } : i)))
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
  const estimatedCount = items.filter((i) => i.size_estimated).length
  const inputClass = 'w-full px-4 py-3 rounded-xl border border-v-muted/15 bg-v-card text-v-text placeholder:text-v-muted/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-v-text tracking-tight">Items</h1>
          <p className="text-v-muted mt-1">{items.length} item{items.length !== 1 ? 's' : ''} in your store</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-medium text-sm hover:shadow-[0_8px_20px_rgba(255,146,62,0.25)] transition-all">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {estimatedCount > 0 && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/25 text-v-warn rounded-2xl px-5 py-4 mb-6 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            {estimatedCount} item{estimatedCount === 1 ? ' is' : 's are'} using an estimated size. Riders are matched by size and
            weight, so enter the real packed size on each item marked <span className="font-semibold">Enter real size</span>.
          </p>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-v-muted/50" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-v-muted/15 bg-v-card text-v-text placeholder:text-v-muted/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 text-sm transition" />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 bg-v-card rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-v-raised rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-v-muted/40" />
          </div>
          <p className="text-v-muted font-medium">No items found</p>
          <p className="text-sm text-v-muted/60 mt-1">Add your first item to get started</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cat = categories.find((c) => c.id === item.menu_id)
            return (
              <div key={item.id} className="bg-v-card rounded-2xl overflow-hidden group">
                <div className="relative h-40 bg-v-raised">
                  {item.image_url
                    ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                    : <div className="flex items-center justify-center h-full"><ImageIcon className="w-10 h-10 text-v-muted/20" /></div>
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(item)} className="p-2 bg-v-raised rounded-xl text-v-text hover:bg-[#ff923e]/20 hover:text-v-accent transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(item.id)} className="p-2 bg-v-raised rounded-xl text-v-text hover:bg-red-500/20 hover:text-v-down transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-v-text text-sm leading-tight">{item.name}</h3>
                    <span className="text-sm font-bold text-v-accent whitespace-nowrap">{formatNaira(item.price)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {cat && <span className="text-xs bg-[#ff923e]/10 text-v-accent px-2 py-0.5 rounded-full">{cat.category_name}</span>}
                    {item.size_estimated ? (
                      <button onClick={() => openEdit(item)}
                        className="inline-flex items-center gap-1 text-xs bg-yellow-500/15 text-v-warn px-2 py-0.5 rounded-full hover:bg-yellow-500/25 transition">
                        <AlertTriangle className="w-3 h-3" /> Enter real size
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-v-raised text-v-muted px-2 py-0.5 rounded-full tabular-nums">
                        <Ruler className="w-3 h-3" /> {item.weight_kg} kg · {item.length_cm}×{item.width_cm}×{item.height_cm} cm
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-v-muted">Stock</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateStock(item.id, -1)} className="w-6 h-6 rounded-lg bg-v-raised text-v-muted hover:bg-red-500/15 hover:text-v-down flex items-center justify-center text-sm font-bold transition">−</button>
                      <span className={`text-sm font-semibold min-w-6 text-center ${item.stock === 0 ? 'text-v-down' : 'text-v-text'}`}>{item.stock}</span>
                      <button onClick={() => handleUpdateStock(item.id, 1)} className="w-6 h-6 rounded-lg bg-v-raised text-v-muted hover:bg-emerald-500/15 hover:text-v-up flex items-center justify-center text-sm font-bold transition">+</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-v-modal rounded-2xl w-full max-w-md shadow-[0_12px_32px_rgba(8,14,28,0.7)]">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-lg font-semibold text-v-text">{editing ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-v-muted/60 hover:text-v-muted transition"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 pb-6 space-y-4">
              {error && <div className="text-sm text-v-down bg-red-500/10 px-3 py-2 rounded-xl">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-v-text mb-1.5">Image</label>
                <div onClick={() => fileRef.current?.click()}
                  className="relative h-36 rounded-xl border border-dashed border-v-muted/20 flex items-center justify-center cursor-pointer hover:border-[#ff923e]/40 transition overflow-hidden">
                  {form.imagePreview
                    ? <Image src={form.imagePreview} alt="preview" fill className="object-cover rounded-xl" />
                    : <div className="text-center"><ImageIcon className="w-8 h-8 text-v-muted/30 mx-auto mb-1" /><span className="text-xs text-v-muted/50">Click to upload image</span></div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
              <div>
                <label className="block text-sm font-medium text-v-text mb-1.5">Name</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Item name" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-v-text mb-1.5">Price (₦)</label>
                  <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-v-text mb-1.5">Stock</label>
                  <input required type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-v-text mb-1.5">Category</label>
                <select value={form.menu_id} onChange={(e) => setForm((f) => ({ ...f, menu_id: e.target.value }))} className={inputClass}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                </select>
              </div>
              <fieldset className="space-y-3">
                <legend className="block text-sm font-medium text-v-text mb-1.5">Packed size</legend>
                <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/25 text-v-warn rounded-xl px-3 py-2.5 text-xs leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                  <p>
                    Enter the size and weight of the item as packed for delivery. Riders are matched to orders by these
                    numbers, so orders with wrong sizes can be refused at pickup and won&apos;t be delivered. That hurts
                    your customers&apos; experience. Measure carefully.
                  </p>
                </div>
                <div>
                  <label htmlFor="item-weight" className="block text-xs text-v-muted mb-1">Weight (kg)</label>
                  <input id="item-weight" required type="number" min="0.01" max={MAX_WEIGHT_KG} step="0.01" value={form.weight_kg}
                    onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))} placeholder="e.g. 0.5" className={inputClass} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {SIZE_FIELDS.map(({ key, label, max }) => (
                    <div key={key}>
                      <label htmlFor={`item-${key}`} className="block text-xs text-v-muted mb-1">{label} (cm)</label>
                      <input id={`item-${key}`} required type="number" min="0.1" max={max} step="0.1" value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder="0" className={inputClass} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-v-muted/20 text-v-muted rounded-full font-medium text-sm hover:bg-v-raised hover:text-v-text transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-2 py-2.5 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-medium text-sm hover:shadow-[0_8px_20px_rgba(255,146,62,0.25)] transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editing ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-v-modal rounded-2xl w-full max-w-sm p-6 shadow-[0_12px_32px_rgba(8,14,28,0.7)]">
            <h2 className="text-lg font-semibold text-v-text mb-2">Delete Item?</h2>
            <p className="text-sm text-v-muted mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-v-muted/20 text-v-muted rounded-full font-medium text-sm hover:bg-v-raised transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 text-white rounded-full font-medium text-sm hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
