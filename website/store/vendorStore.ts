import { create } from 'zustand'
import { type VendorRow } from '@/lib/supabase'

type VendorStore = {
  vendor: VendorRow | null
  setVendor: (vendor: VendorRow | null) => void
  clearVendor: () => void
}

export const useVendorStore = create<VendorStore>((set) => ({
  vendor: null,
  setVendor: (vendor) => set({ vendor }),
  clearVendor: () => set({ vendor: null }),
}))

export const useVendor = () => ({ vendor: useVendorStore((s) => s.vendor) })
