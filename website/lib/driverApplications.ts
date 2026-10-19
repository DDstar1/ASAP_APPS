import { supabase } from '@/lib/supabase'
import { rust } from '@/lib/rust'

export type ApplicationStatus = 'submitted' | 'contacted' | 'approved' | 'rejected' | 'withdrawn'

export type DriverApplication = {
  id: number
  asset_type: 'ev' | 'bicycle'
  full_name: string
  phone: string
  area: string
  status: ApplicationStatus
  contacted_at: string | null
  decided_at: string | null
  created_at: string
}

export type ApplicationForm = {
  asset_type: 'ev' | 'bicycle'
  full_name: string
  phone: string
  area: string
  nin: string
  license_number: string | null
  experience: string | null
  guarantor_name: string | null
  guarantor_phone: string | null
}

export function getMyApplication(userId: string) {
  return supabase.from('driver_applications')
    .select('id, asset_type, full_name, phone, area, status, contacted_at, decided_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

// 201 with the application · 400 invalid field · 409 one already in progress
export function submitApplication(form: ApplicationForm) {
  return rust<DriverApplication>('/drivers/applications', form)
}

// 0803 123 4567 / 803... / +234803... -> +2348031234567
export function toE164(input: string) {
  const digits = input.replace(/[^\d+]/g, '')
  if (/^\+234\d{10}$/.test(digits)) return digits
  if (/^234\d{10}$/.test(digits)) return `+${digits}`
  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`
  if (/^\d{10}$/.test(digits)) return `+234${digits}`
  return null
}
