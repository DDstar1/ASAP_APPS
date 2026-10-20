'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Tag, AlertCircle } from 'lucide-react'
import { getVendorCategories, getVendorItemIdAndMenu, insertCategory, deleteCategory } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import type { MenuRow } from '@/lib/supabase'

export default function CategoriesPage() {
  const { vendor } = useVendor()
  const [categories, setCategories] = useState<MenuRow[]>([])
  const [itemCounts, setItemCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!vendor) return
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor])

  async function load() {
    const [catRes, itemsRes] = await Promise.all([
      getVendorCategories(vendor!.id),
      getVendorItemIdAndMenu(vendor!.id),
    ])
    const cats: MenuRow[] = catRes.data || []
    setCategories(cats)
    const counts: Record<number, number> = {}
    for (const item of (itemsRes.data || [])) {
      if (item.menu_id) counts[item.menu_id] = (counts[item.menu_id] || 0) + 1
    }
    setItemCounts(counts)
    setLoading(false)
  }

  async function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    const { error: err } = await insertCategory(vendor!.id, newName.trim())
    if (err) { setError(err.code === '23505' ? 'Category already exists.' : err.message); setAdding(false); return }
    setNewName('')
    setAdding(false)
    await load()
  }

  async function handleDelete(id: number) {
    await deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setDeleteId(null)
  }

  const deleteTarget = categories.find((c) => c.id === deleteId)
  const deleteItemCount = deleteId ? (itemCounts[deleteId] || 0) : 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-v-text tracking-tight">Categories</h1>
        <p className="text-v-muted mt-1">Organise your menu into categories</p>
      </div>

      <div className="bg-v-card rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-v-text mb-3">Add New Category</h2>
        {error && (
          <div className="flex items-center gap-2 text-sm text-v-down bg-red-500/10 px-3 py-2 rounded-xl mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        <form onSubmit={handleAdd} className="flex gap-3">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Beverages, Snacks, Main Meals..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-v-muted/15 bg-v-raised text-v-text placeholder:text-v-muted/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 text-sm transition" />
          <button type="submit" disabled={adding || !newName.trim()}
            className="px-4 py-2.5 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-medium text-sm hover:shadow-[0_8px_20px_rgba(255,146,62,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-v-card rounded-2xl animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-v-raised rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-v-muted/40" />
          </div>
          <p className="text-v-muted font-medium">No categories yet</p>
          <p className="text-sm text-v-muted/60 mt-1">Add your first category above</p>
        </div>
      ) : (
        <div className="bg-v-card rounded-2xl overflow-hidden">
          <div className="flex flex-col gap-0.5">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-4 bg-v-surface hover:bg-v-card transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#ff923e]/10 rounded-xl flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-v-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-v-text">{cat.category_name}</p>
                    <p className="text-xs text-v-muted">{itemCounts[cat.id] || 0} item{(itemCounts[cat.id] || 0) !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={() => setDeleteId(cat.id)} className="p-2 text-v-muted/50 hover:text-v-down hover:bg-red-500/10 rounded-xl transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-v-modal rounded-2xl w-full max-w-sm p-6 shadow-[0_12px_32px_rgba(8,14,28,0.7)]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-v-down" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-v-text">Delete &ldquo;{deleteTarget?.category_name}&rdquo;?</h2>
                {deleteItemCount > 0 && (
                  <p className="text-sm text-v-warn mt-1">{deleteItemCount} item{deleteItemCount !== 1 ? 's' : ''} will become uncategorized.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-v-muted/20 text-v-muted rounded-full font-medium text-sm hover:bg-v-raised transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId!)} className="flex-1 py-2.5 bg-red-600 text-white rounded-full font-medium text-sm hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
