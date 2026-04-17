'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Loader2, X, ImageIcon, Search, Package } from 'lucide-react'
import { supabase, type ItemRow, type MenuRow } from '@/lib/supabase'
import { useVendor } from '../layout'

type ItemForm = { name: string; price: string; stock: string; menu_id: string; imageFile: File | null; imagePreview: string }

const emptyForm: ItemForm = { name: '', price: '', stock: '', menu_id: '', imageFile: null, imagePreview: '' }

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
  }, [vendor])

  async function load() {
    const [itemsRes, catRes] = await Promise.all([
      supabase.from('telegram_vendor_item').select('*').eq('vendor_id', vendor!.id).order('id', { ascending: false }),
      supabase.from('telegram_vendor_menu').select('*').eq('vendor_id', vendor!.id).order('category_name'),
    ])
    setItems(itemsRes.data || [])
    setCategories(catRes.data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(item: ItemRow) {
    setEditing(item)
    setForm({
      name: item.name,
      price: String(item.price),
      stock: String(item.stock),
      menu_id: String(item.menu_id ?? ''),
      imageFile: null,
      imagePreview: item.image_url ?? '',
    })
    setError('')
    setModalOpen(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((f) => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file) }))
  }

  async function uploadImage(file: File, itemName: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${vendor!.id}/${Date.now()}-${itemName.replace(/\s+/g, '-')}.${ext}`
    const { error } = await supabase.storage.from('vendor-item-images').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('vendor-item-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let image_url = editing?.image_url ?? null
    if (form.imageFile) {
      const url = await uploadImage(form.imageFile, form.name)
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
    }

    if (editing) {
      const { error: err } = await supabase.from('telegram_vendor_item').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('telegram_vendor_item').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }

    await load()
    setModalOpen(false)
    setSaving(false)
  }

  async function handleDelete(id: number) {
    await supabase.from('telegram_vendor_item').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleteId(null)
  }

  async function updateStock(id: number, delta: number) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const newStock = Math.max(0, item.stock + delta)
    await supabase.from('telegram_vendor_item').update({ stock: newStock }).eq('id', id)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stock: newStock } : i)))
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Items</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">{items.length} item{items.length !== 1 ? 's' : ''} in your store</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
        />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-white dark:bg-gray-800/50 rounded-2xl animate-pulse border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No items found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first item to get started</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cat = categories.find((c) => c.id === item.menu_id)
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
                {/* Image */}
                <div className="relative h-40 bg-gray-100 dark:bg-gray-700">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 bg-white rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-2 bg-white rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{item.name}</h3>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{formatNaira(item.price)}</span>
                  </div>
                  {cat && (
                    <span className="inline-block text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full mb-2">
                      {cat.category_name}
                    </span>
                  )}

                  {/* Stock control */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Stock</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateStock(item.id, -1)} className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 flex items-center justify-center text-sm font-bold transition">−</button>
                      <span className={`text-sm font-semibold min-w-[24px] text-center ${item.stock === 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{item.stock}</span>
                      <button onClick={() => updateStock(item.id, 1)} className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 flex items-center justify-center text-sm font-bold transition">+</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</div>}

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Image</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative h-36 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden"
                >
                  {form.imagePreview ? (
                    <Image src={form.imagePreview} alt="preview" fill className="object-cover rounded-xl" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-400">Click to upload image</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Item name" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (₦)</label>
                  <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Stock</label>
                  <input required type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                <select value={form.menu_id} onChange={(e) => setForm((f) => ({ ...f, menu_id: e.target.value }))} className={inputClass}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-[2] py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editing ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Item?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
