import Link from 'next/link'
import { Package, Instagram, Facebook, Linkedin, Youtube } from 'lucide-react'

// Same inbox the customer app uses (customer_app/constants/support.ts)
const SUPPORT_EMAIL = 'support@asap.ng'

// Fill in each href once the accounts are live; empty ones show but go nowhere
const SOCIALS = [
  { label: 'Instagram', href: '', icon: <Instagram className="w-5 h-5" /> },
  { label: 'Facebook', href: '', icon: <Facebook className="w-5 h-5" /> },
  { label: 'X', href: '', icon: <XLogo /> },
  { label: 'LinkedIn', href: '', icon: <Linkedin className="w-5 h-5" /> },
  { label: 'YouTube', href: '', icon: <Youtube className="w-5 h-5" /> },
]

const COLUMNS = [
  {
    title: 'Company',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Become a vendor', href: '/become-vendor' },
      { label: 'Become a rider', href: '/become-driver' },
      { label: 'Asset Discovery', href: '/invest' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Get started', href: '/signup' },
      { label: 'Vendor dashboard', href: '/vendor/dashboard' },
      { label: 'Delete account', href: '/delete-account' },
    ],
  },
]

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="bg-[#ff7a00] text-black text-lg sm:text-xl px-4 sm:px-6 lg:px-[7.5%] pt-16 pb-8">
      <div>
        <Link href="/" className="inline-flex items-center gap-3" aria-label="ASAP home">
          <Package className="w-14 h-14 sm:w-16 sm:h-16" strokeWidth={1.75} />
          <span className="text-6xl sm:text-7xl font-black tracking-tight">ASAP.</span>
        </Link>
        <p className="mt-5 text-xl sm:text-2xl text-black/75 max-w-xl">
          Last-mile delivery, payments and payouts for your city.
        </p>
      </div>

      <div className="mt-12 pt-12 border-t border-black/15 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold">Address</h3>
          <p className="mt-6 text-black/80 leading-relaxed">Benin City, Edo State, Nigeria</p>
        </div>

        <div>
          <h3 className="text-2xl sm:text-3xl font-bold">Contact</h3>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-6 block text-black/80 hover:text-black transition-colors">
            {SUPPORT_EMAIL}
          </a>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-2xl sm:text-3xl font-bold">{col.title}</h3>
            <ul className="mt-6 space-y-4">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-black/80 hover:text-black transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-black/15 flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
        <p className="text-black/80">&copy; {new Date().getFullYear()} ASAP</p>
        <div className="flex gap-3">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href || undefined} target={s.href ? '_blank' : undefined} rel="noopener noreferrer"
              aria-label={s.label}
              className="w-12 h-12 rounded-full border border-black/30 flex items-center justify-center hover:bg-black hover:text-[#ff7a00] transition-colors cursor-pointer">
              {s.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
