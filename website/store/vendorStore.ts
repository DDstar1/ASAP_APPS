import { create } from 'zustand'
import { type VendorRow } from '@/lib/supabase'

type VendorStore = {
  vendors: VendorRow[]
  vendor: VendorRow | null          // active store
  setVendors: (vendors: VendorRow[]) => void
  setVendor: (vendor: VendorRow | null) => void
  clearVendor: () => void
}

export const useVendorStore = create<VendorStore>((set) => ({
  vendors: [],
  vendor: null,
  setVendors: (vendors) => set({ vendors }),
  setVendor: (vendor) => set({ vendor }),
  clearVendor: () => set({ vendor: null, vendors: [] }),
}))

export const useVendor = () => ({ vendor: useVendorStore((s) => s.vendor) })
