'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ExternalLink, Loader2, CheckCircle, ToggleLeft, ToggleRight, AlertCircle, Sparkles, Lock,
} from 'lucide-react'
import { getVendorBot, updateBotActive, updateBotUsername, updateVendor } from '@/lib/supabase_queries'
import { useVendor, useVendorStore } from '@/store/vendorStore'
import type { VendorRow } from '@/lib/supabase'
import { STRIKE_LIMIT } from '@/lib/vendorGuidelines'

// A bot is paired in the same write that creates the store (DB trigger). The
// token never reaches the browser, not even for the owning vendor. The vendor
// names the bot here.
type BotRow = {
  id: number
  bot_id: number | null
  bot_username: string | null
  bot_link: string | null // https://t.me/<handle>, set by Zazu
  vendor_id: number
  is_active: boolean
  suspended_at: string | null // 5 strikes; only support can lift it
  billing_paused_at: string | null // subscription unpaid; lifts itself once paid
  created_at: string
}

export default function BotPage() {
  const { vendor } = useVendor()
  const [bot, setBot] = useState<BotRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [savingName, setSavingName] = useState(false)
  // The bot's welcome message lives on the store (telegram_vendor.message_body)
  const [welcome, setWelcome] = useState('')
  const [savingWelcome, setSavingWelcome] = useState(false)
  const [welcomeSaved, setWelcomeSaved] = useState(false)

  // Reset when the vendor switches store (during render, not in an effect)
  const [welcomeFor, setWelcomeFor] = useState<number | null>(null)
  if (vendor && welcomeFor !== vendor.id) {
    setWelcomeFor(vendor.id)
    setWelcome(vendor.message_body ?? '')
    setWelcomeSaved(false)
  }

  useEffect(() => {
    if (!vendor) return
    getVendorBot(vendor.id).then(({ data }) => {
      const botData = data as BotRow | null
      setBot(botData)
      // A vendor has subscription access if they already have a bot attached
      setHasSubscription(!!botData)
      setLoading(false)
    })
  }, [vendor])

  async function handleToggle() {
    if (!bot) return
    setToggling(true)
    setError('')
    const { error: dbError } = await updateBotActive(bot.id, !bot.is_active)
    if (dbError) setError('Could not update the bot. Try again.')
    else setBot((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev)
    setToggling(false)
  }

  async function handleSaveUsername(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!bot) return
    const name = username.trim()
    if (!name) return
    setSavingName(true)
    setError('')
    const { error: dbError } = await updateBotUsername(bot.id, name)
    if (dbError) setError(dbError.code === '23505' ? 'That bot name is already taken.' : 'Could not save the bot name. Try again.')
    else {
      setBot((prev) => prev ? { ...prev, bot_username: name } : prev)
      setUsername('')
    }
    setSavingName(false)
  }

  async function handleSaveWelcome(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!vendor) return
    setSavingWelcome(true)
    setWelcomeSaved(false)
    setError('')
    const { data, error: dbError } = await updateVendor(vendor.id, { message_body: welcome.trim() || null })
    if (dbError || !data) setError('Could not save the welcome message. Try again.')
    else {
      const row = data as VendorRow
      const { vendors, setVendor, setVendors } = useVendorStore.getState()
      setVendor(row)
      setVendors(vendors.map((v) => (v.id === row.id ? row : v)))
      setWelcomeSaved(true)
    }
    setSavingWelcome(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-v-accent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-v-text tracking-tight">Telegram Bot</h1>
        <p className="text-v-muted mt-1">The Telegram bot your customers order from</p>
      </div>

      {/* No subscription — upsell gate */}
      {!hasSubscription && !bot && (
        <div className="bg-v-card rounded-2xl p-8 mb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#ff923e]/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-v-accent" />
          </div>
          <h2 className="text-lg font-bold text-v-text mb-2">Subscription Required</h2>
          <p className="text-v-muted text-sm max-w-sm mb-6">
            A Telegram bot for your store is a premium feature. Upgrade your plan to connect a bot and start receiving orders directly from customers on Telegram.
          </p>
          <div className="w-full bg-v-raised rounded-xl p-5 mb-6 text-left space-y-3">
            {[
              'Receive orders directly in Telegram',
              'Automated order confirmations & updates',
              'Custom bot name for your brand',
              'Activate or pause the bot anytime',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-v-muted">
                <CheckCircle className="w-4 h-4 text-v-up shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Link
            href="/vendor/dashboard/billing"
            className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to get a Bot
          </Link>
        </div>
      )}

      {/* Assigned bot */}
      {bot && (
        <div className="bg-v-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-v-text flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-v-up" />
              Your Bot
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${bot.suspended_at ? 'bg-red-500/10 text-v-down' : bot.billing_paused_at ? 'bg-amber-500/10 text-v-warn' : bot.is_active ? 'bg-emerald-500/10 text-v-up' : 'bg-v-muted/10 text-v-muted'}`}>
              {bot.suspended_at ? 'Suspended' : bot.billing_paused_at ? 'Paused — unpaid' : bot.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {bot.suspended_at && (
            <div className="flex items-start gap-2 bg-red-500/10 text-v-down px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              This bot was deactivated after {STRIKE_LIMIT} cancelled orders. Call ASAP support to have it reinstated.
            </div>
          )}

          {bot.billing_paused_at && !bot.suspended_at && (
            <div className="flex items-start gap-2 bg-amber-500/10 text-v-warn px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Your bot is off because your subscription payment is overdue. It switches back on as soon as you pay.{' '}
                <Link href="/vendor/dashboard/billing" className="font-semibold underline underline-offset-2">Go to Billing</Link>
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 text-v-down px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-v-muted/10">
              <span className="text-sm text-v-muted">Display name</span>
              {bot.bot_username ? (
                <span className="text-sm font-medium text-v-text">{bot.bot_username}</span>
              ) : (
                <span className="text-sm text-v-muted">Not named yet</span>
              )}
            </div>
            {bot.bot_link && (
              <div className="flex items-center justify-between py-3 border-b border-v-muted/10">
                <span className="text-sm text-v-muted">Link</span>
                <a
                  href={bot.bot_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#229ED9] hover:underline flex items-center gap-1"
                >
                  Open bot
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
            {bot.bot_id !== null && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-v-muted">Bot ID</span>
                <span className="text-sm text-v-text font-mono">{bot.bot_id}</span>
              </div>
            )}
          </div>

          {!bot.bot_username && !bot.suspended_at && (
            <form onSubmit={handleSaveUsername} className="space-y-3">
              <label className="block text-sm font-medium text-v-text">Name your bot</label>
              <p className="text-xs text-v-muted/60">The name customers see on your bot in Telegram</p>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Mercury Wears"
                className="w-full px-4 py-3 rounded-xl border border-v-muted/15 bg-v-raised text-v-text placeholder:text-v-muted/40 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition text-sm"
              />
              <button
                type="submit"
                disabled={savingName || !username.trim()}
                className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save name'}
              </button>
            </form>
          )}

          {!bot.suspended_at && !bot.billing_paused_at && <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition flex-1 justify-center ${
                bot.is_active
                  ? 'border border-v-muted/20 text-v-muted hover:bg-v-raised hover:text-v-text'
                  : 'bg-emerald-500/15 text-v-up hover:bg-emerald-500/25'
              } disabled:opacity-60`}
            >
              {toggling
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : bot.is_active
                ? <ToggleLeft className="w-4 h-4" />
                : <ToggleRight className="w-4 h-4" />
              }
              {bot.is_active ? 'Turn bot off' : 'Turn bot on'}
            </button>
          </div>}
        </div>
      )}

      {/* Welcome message */}
      {bot && (
        <form onSubmit={handleSaveWelcome} className="bg-v-card rounded-2xl p-6 space-y-3 mt-6">
          <label htmlFor="welcome-message" className="block text-base font-semibold text-v-text">Welcome message</label>
          <p className="text-xs text-v-muted/60">What your bot says when a customer starts a chat</p>
          <textarea
            id="welcome-message"
            rows={4}
            maxLength={1000}
            value={welcome}
            onChange={(e) => { setWelcome(e.target.value); setWelcomeSaved(false) }}
            placeholder={`Welcome to ${vendor?.name ?? 'our store'}! Browse the menu and order in a few taps.`}
            className="w-full px-4 py-3 rounded-xl border border-v-muted/15 bg-v-raised text-v-text placeholder:text-v-muted/40 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition text-sm resize-y"
          />
          <div className="flex items-center justify-end gap-3">
            {welcomeSaved && (
              <span className="flex items-center gap-1.5 text-sm text-v-up">
                <CheckCircle className="w-4 h-4" />
                Saved
              </span>
            )}
            <button
              type="submit"
              disabled={savingWelcome || welcome.trim() === (vendor?.message_body ?? '')}
              className="py-2.5 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingWelcome ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save message'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
