'use client'

import { useEffect, useState } from 'react'
import {
  Bot, ExternalLink, Loader2, CheckCircle, Trash2,
  ToggleLeft, ToggleRight, AlertCircle, Copy, Check, Sparkles, Lock,
} from 'lucide-react'
import { getVendorBot, insertBot, updateBotActive, deleteBot } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'

type BotRow = {
  id: number
  bot_id: number
  bot_username: string
  bot_token: string
  vendor_id: number
  is_active: boolean
  created_at: string
}

export default function BotPage() {
  const { vendor } = useVendor()
  const [bot, setBot] = useState<BotRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [token, setToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

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

  async function handleConnect(e: React.SyntheticEvent) {
    e.preventDefault()
    setConnecting(true)
    setError('')

    let botInfo: { id: number; username: string } | null = null
    try {
      const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`)
      const json = await res.json()
      if (!json.ok) { setError('Invalid bot token. Make sure you copied it correctly from @BotFather.'); setConnecting(false); return }
      botInfo = { id: json.result.id, username: json.result.username }
    } catch {
      setError('Could not reach Telegram API. Check your connection.')
      setConnecting(false)
      return
    }

    const { error: dbError } = await insertBot({
      bot_id: botInfo.id,
      bot_username: botInfo.username,
      bot_token: token.trim(),
      vendor_id: vendor!.id,
    })

    if (dbError) {
      setError(dbError.code === '23505' ? 'This bot is already connected to a store.' : dbError.message)
      setConnecting(false)
      return
    }

    const { data } = await getVendorBot(vendor!.id)
    setBot(data as BotRow)
    setHasSubscription(true)
    setToken('')
    setConnecting(false)
  }

  async function handleToggle() {
    if (!bot) return
    setToggling(true)
    await updateBotActive(bot.id, !bot.is_active)
    setBot((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev)
    setToggling(false)
  }

  async function handleDelete() {
    if (!bot) return
    setDeleting(true)
    await deleteBot(bot.id)
    setBot(null)
    setDeleting(false)
  }

  function copyToken() {
    if (!bot) return
    navigator.clipboard.writeText(bot.bot_token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff923e]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e0e5f9]">Telegram Bot</h1>
        <p className="text-[#a5abbd] mt-1 text-sm">Connect a Telegram bot to receive orders from customers</p>
      </div>

      {/* No subscription — upsell gate */}
      {!hasSubscription && !bot && (
        <div className="bg-[#152035] rounded-2xl p-8 mb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#ff923e]/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-[#ff923e]" />
          </div>
          <h2 className="text-lg font-bold text-[#e0e5f9] mb-2">Subscription Required</h2>
          <p className="text-[#a5abbd] text-sm max-w-sm mb-6">
            A Telegram bot for your store is a premium feature. Upgrade your plan to connect a bot and start receiving orders directly from customers on Telegram.
          </p>
          <div className="w-full bg-[#1c2a42] rounded-xl p-5 mb-6 text-left space-y-3">
            {[
              'Receive orders directly in Telegram',
              'Automated order confirmations & updates',
              'Custom bot name for your brand',
              'Activate or pause the bot anytime',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-[#a5abbd]">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <button
            className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all flex items-center justify-center gap-2"
            onClick={() => {
              // TODO: link to your subscription/payment flow
              alert('Subscription flow coming soon!')
            }}
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to get a Bot
          </button>
        </div>
      )}

      {/* Has subscription — how-to guide */}
      {(hasSubscription || bot) && (
        <div className="bg-[#152035] rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-[#e0e5f9] mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#ff923e]" />
            How to get a bot
          </h2>
          <ol className="space-y-3 text-sm text-[#a5abbd]">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#ff923e]/15 text-[#ff923e] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Open Telegram and search for <strong className="text-[#e0e5f9]">@BotFather</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#ff923e]/15 text-[#ff923e] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Send the command <code className="bg-[#1c2a42] px-1.5 py-0.5 rounded text-[#e0e5f9]">/newbot</code> and follow the prompts to name your bot</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#ff923e]/15 text-[#ff923e] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>BotFather will give you a token that looks like <code className="bg-[#1c2a42] px-1.5 py-0.5 rounded text-[#e0e5f9]">123456:ABC-DEF...</code></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#ff923e]/15 text-[#ff923e] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>Paste that token below to connect your bot to your store</span>
            </li>
          </ol>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-[#229ED9]/15 text-[#229ED9] text-sm font-medium hover:bg-[#229ED9]/25 transition"
          >
            <Bot className="w-4 h-4" />
            Open @BotFather
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Connected bot */}
      {bot ? (
        <div className="bg-[#152035] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#e0e5f9] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Bot Connected
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${bot.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#a5abbd]/10 text-[#a5abbd]'}`}>
              {bot.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-[#a5abbd]/10">
              <span className="text-sm text-[#a5abbd]">Username</span>
              <a
                href={`https://t.me/${bot.bot_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#229ED9] hover:underline flex items-center gap-1"
              >
                @{bot.bot_username}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#a5abbd]/10">
              <span className="text-sm text-[#a5abbd]">Bot ID</span>
              <span className="text-sm text-[#e0e5f9] font-mono">{bot.bot_id}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#a5abbd]/10">
              <span className="text-sm text-[#a5abbd]">Token</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#e0e5f9] font-mono">
                  {bot.bot_token.slice(0, 10)}••••••••••••
                </span>
                <button
                  onClick={copyToken}
                  className="p-1.5 rounded-lg text-[#a5abbd]/60 hover:text-[#a5abbd] hover:bg-[#1c2a42] transition"
                  title="Copy token"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[#a5abbd]">Connected</span>
              <span className="text-sm text-[#e0e5f9]">
                {new Date(bot.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition flex-1 justify-center ${
                bot.is_active
                  ? 'border border-[#a5abbd]/20 text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9]'
                  : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
              } disabled:opacity-60`}
            >
              {toggling
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : bot.is_active
                ? <ToggleLeft className="w-4 h-4" />
                : <ToggleRight className="w-4 h-4" />
              }
              {bot.is_active ? 'Deactivate bot' : 'Activate bot'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition disabled:opacity-60"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Disconnect
            </button>
          </div>
        </div>
      ) : hasSubscription ? (
        /* Connect form — subscription confirmed, no bot yet */
        <div className="bg-[#152035] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-[#e0e5f9] mb-4">Connect your bot</h2>
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Bot Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                className="w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#1c2a42] text-[#e0e5f9] placeholder:text-[#a5abbd]/40 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition font-mono text-sm"
              />
              <p className="text-xs text-[#a5abbd]/60 mt-1.5">Paste the token you received from @BotFather</p>
            </div>
            <button
              type="submit"
              disabled={connecting || !token.trim()}
              className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : <><Bot className="w-4 h-4" /> Connect Bot</>}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
