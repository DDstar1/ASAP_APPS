import { supabase } from '@/lib/supabase'
import { getMyAccess } from '@/lib/supabase_queries'

// Where a signed-in user starts: vendor panel, then the owner panel if they
// hold a slot, otherwise home. invest_accounts alone isn't enough: the
// PIN/bank setup at first checkout can create it before anything is owned.
export async function landingPath(userId: string) {
  const { data: access } = await getMyAccess()
  if ((access?.vendor_ids?.length ?? 0) > 0) return '/vendor/dashboard'
  if (access?.investor) {
    const { count } = await supabase.from('invest_slots')
      .select('id', { count: 'exact', head: true }).eq('owner_id', userId)
    if ((count ?? 0) > 0) return '/invest'
  }
  return '/home'
}

// Same-site paths only, so a crafted link can't bounce users off-site.
// /home counts as no preference, so a fresh sign-in still lands on the right panel.
export function explicitNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  return next === '/home' ? null : next
}
