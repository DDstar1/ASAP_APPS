// Shared pieces for the privacy policy pages (app/privacy). The apps link here, so these
// pages are what App Store and Google Play reviewers read.

export const COMPANY = {
  name: 'ASAP Group of Companies',
  email: 'asap.support.team@gmail.com',
  phone: '+234 704 203 6840',
  address: 'Idu Industrial Area, Abuja, Federal Capital Territory, Nigeria',
}

export function PolicyPage({ title, updated, intro, children }: {
  title: string; updated: string; intro: string; children: React.ReactNode
}) {
  return (
    <article className="max-w-3xl mx-auto">
      <p className="text-[#ff7a00] font-medium uppercase tracking-wide text-sm">Privacy policy</p>
      <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-3 text-[#a5abbd]">Last updated: {updated}</p>
      <p className="mt-8 text-lg text-[#d4d8e6] leading-relaxed">{intro}</p>
      <div className="mt-12 space-y-12">{children}</div>
    </article>
  )
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-white">{n}. {title}</h2>
      <div className="mt-4 space-y-4 text-[#c9cee0] leading-relaxed">{children}</div>
    </section>
  )
}

export function Group({ title, items }: { title?: string; items: React.ReactNode[] }) {
  return (
    <div>
      {title && <p className="font-semibold text-white mb-2">{title}</p>}
      <ul className="list-disc pl-6 space-y-1.5 marker:text-[#ff7a00]">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

// The same on both policies
export function Processors() {
  return (
    <Group title="Service providers that process data for us" items={[
      <><strong className="text-white">Supabase</strong>: hosts our database, sign-in and file storage (including photos).</>,
      <><strong className="text-white">Korapay</strong>: processes payments, refunds and payouts.</>,
      <><strong className="text-white">Google Maps Platform</strong>: shows maps and looks up the addresses you search for.</>,
      <><strong className="text-white">Expo, Google Firebase Cloud Messaging and Apple Push Notification service</strong>: deliver push notifications to your device.</>,
    ]} />
  )
}

export function Rights() {
  return (
    <>
      <p>Under the Nigeria Data Protection Act 2023 you have the right to:</p>
      <Group items={[
        'Know what personal data we hold about you',
        'Access a copy of your personal data',
        'Correct inaccurate personal data',
        'Request deletion of your personal data (subject to legal retention obligations)',
        'Object to certain uses of your personal data',
        'Lodge a complaint with the Nigeria Data Protection Commission (NDPC)',
      ]} />
      <p>To exercise any of these rights, contact us at <Email />.</p>
    </>
  )
}

export function Email() {
  return <a href={`mailto:${COMPANY.email}`} className="text-[#ff923e] underline underline-offset-2">{COMPANY.email}</a>
}

export function Contact() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0e0e] p-6 space-y-1">
      <p className="font-semibold text-white">{COMPANY.name}</p>
      <p>Email: <Email /></p>
      <p>Phone: <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="text-[#ff923e]">{COMPANY.phone}</a></p>
      <p>Address: {COMPANY.address}</p>
    </div>
  )
}
