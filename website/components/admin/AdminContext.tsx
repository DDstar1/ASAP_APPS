'use client'

import { createContext, useContext } from 'react'
import type { Me, Period } from '@/lib/admin'

export type AdminSession = {
  me: Me
  email: string
  // One period for every tab, so switching tabs keeps the same window
  period: Period
  setPeriod: (p: Period) => void
}

export const AdminContext = createContext<AdminSession | null>(null)

export function useAdmin() {
  const value = useContext(AdminContext)
  if (!value) throw new Error('useAdmin must be used inside the admin layout')
  return value
}
