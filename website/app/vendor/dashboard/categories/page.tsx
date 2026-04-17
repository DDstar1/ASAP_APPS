'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, X, Tag, AlertCircle } from 'lucide-react'
import { supabase, type MenuRow } from '@/lib/supabase'
import { useVendor } from '../layout'

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
  }, [vendor])

  async function load() {
    const [catRes, itemsRes] = await Promise.all([
      supabase.from('telegram_vendor_menu').select('*').eq('vendor_id', vendor!.id).order('category_name'),
      supabase.from('telegram_vendor_item').select('id, menu_id').eq('vendor_id', vendor!.id),
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')

    const { error: err } = await supabase.from('telegram_vendor_menu').insert({
      vendor_id: vendor!.id,
      category_name: newName.trim(),
    })

    if (err) {
      setError(err.code === '23505' ? 'Category already exists.' : err.message)
      setAdding(false)
      return
    }

    setNewName('')
    setAdding(false)
    await load()
  }

  async function handleDelete(id: number) {
    await supabase.from('telegram_vendor_menu').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setDeleteId(null)
  }

  const deleteTarget = categories.find((c) => c.id === deleteId)
  const deleteItemCount = deleteId ? (itemCounts[deleteId] || 0) : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">Organise your menu into categories</p>
      </div>

      {/* Add category form */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add New Category</h2>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl mb-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Beverages, Snacks, Main Meals..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>
      </div>

      {/* Categories list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-gray-800/50 rounded-2xl animate-pulse border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No categories yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first category above</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{cat.category_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{itemCounts[cat.id] || 0} item{(itemCounts[cat.id] || 0) !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Delete &ldquo;{deleteTarget?.category_name}&rdquo;?</h2>
                {deleteItemCount > 0 && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                    {deleteItemCount} item{deleteItemCount !== 1 ? 's' : ''} will become uncategorized.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteId!)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
