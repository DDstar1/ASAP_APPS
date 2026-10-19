'use client'

import { createContext, useContext } from 'react'

export type InvestSession = {
  userId: string
  investor: boolean
  username: string
  setUsername: (name: string) => void
  unreadNotifications: number
  unreadMessages: number
  refreshUnread: () => void
}

export const InvestContext = createContext<InvestSession | null>(null)

export function useInvest() {
  const value = useContext(InvestContext)
  if (!value) throw new Error('useInvest must be used inside app/invest')
  return value
}
