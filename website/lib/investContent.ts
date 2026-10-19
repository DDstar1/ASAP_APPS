import type { AssetType } from '@/lib/invest'

// The long-form copy under each plan's page. invest_plans only holds name,
// description and the numbers, so this lives here, one block per asset type.
// Anything in [brackets] is a placeholder for ASAP to fill in.
// Copy calls slot holders "owners", never investors.
export type PlanContent = {
  tagline: string
  overview: string[]
  specs: { label: string; value: string }[]
  safetyKit: string[]
  serviceArea: { summary: string; zones: string[] }
}

export const PLAN_CONTENT: Record<AssetType, PlanContent> = {
  ev: {
    tagline: 'Own a share of an electric delivery bike',
    overview: [
      'Each electric bike is split into four slots. Buy one slot to own a quarter of the bike, or all four to own the whole bike.',
      'Once the bike is fully owned, ASAP buys it, registers it and puts it on the road with a vetted ASAP rider. You earn a share of every trip fare it makes.',
    ],
    specs: [
      { label: 'Vehicle', value: '[Make and model]' },
      { label: 'Motor', value: '[Power, e.g. 3 kW]' },
      { label: 'Range per charge', value: '[e.g. 100 km]' },
      { label: 'Top speed', value: '[e.g. 75 km/h]' },
      { label: 'Battery', value: '[Capacity and swap/charge method]' },
      { label: 'Load capacity', value: '[e.g. 150 kg]' },
      { label: 'Expected service life', value: '[e.g. 4 years]' },
    ],
    safetyKit: [
      '[Helmet for the rider]',
      '[Reflective vest]',
      '[Gloves]',
      '[Delivery box]',
      '[GPS tracker]',
      '[Insurance cover]',
    ],
    serviceArea: {
      summary: '[City]: the bike only takes trips inside ASAP’s service area.',
      zones: ['[Zone 1]', '[Zone 2]', '[Zone 3]'],
    },
  },
  bicycle: {
    tagline: 'Own a delivery bicycle outright',
    overview: [
      'A bicycle is a single slot: one owner holds the whole bike.',
      'ASAP puts it on the road with a vetted ASAP rider for short-distance deliveries. You earn a share of every trip fare it makes.',
    ],
    specs: [
      { label: 'Vehicle', value: '[Make and model]' },
      { label: 'Frame', value: '[e.g. Steel, cargo rack]' },
      { label: 'Gears', value: '[e.g. 7-speed]' },
      { label: 'Load capacity', value: '[e.g. 30 kg]' },
      { label: 'Expected service life', value: '[e.g. 3 years]' },
    ],
    safetyKit: [
      '[Helmet for the rider]',
      '[Reflective vest]',
      '[Front and rear lights]',
      '[Lock]',
      '[Delivery bag]',
    ],
    serviceArea: {
      summary: '[City]: bicycles take shorter trips inside ASAP’s service area.',
      zones: ['[Zone 1]', '[Zone 2]'],
    },
  },
}

// The same for every plan: how ownership works. Built from the plan's numbers
// so it never disagrees with them.
export function ownershipTerms(p: { ownerPct: number; totalSlots: number; fundingDays: number }) {
  const perSlot = Number((p.ownerPct / p.totalSlots).toFixed(3))
  return [
    {
      title: 'What you earn',
      body: p.totalSlots > 1
        ? `The asset pays ${p.ownerPct}% of every trip fare to its owners, split equally across its ${p.totalSlots} slots. Each slot earns ${perSlot}% of every fare.`
        : `You earn ${p.ownerPct}% of every trip fare the asset makes.`,
    },
    {
      title: 'Sale window',
      body: `An asset is open for ${p.fundingDays} days. If slots are still unsold at the end, ASAP buys them so the asset can go on the road, and may offer them to new owners later.`,
    },
    {
      title: 'Holding your slot',
      body: 'Your slot is held for 30 minutes while you pay. If payment does not complete in that time, the slot is released.',
    },
    {
      title: 'Statements and withdrawals',
      body: 'Earnings are updated weekly. You can withdraw your balance to your bank account once a month.',
    },
    {
      title: 'Riders',
      body: 'ASAP assigns, vets and manages the rider. You see your asset by its code and plate number; rider details are not shared.',
    },
    {
      title: 'Transfers',
      body: 'You can transfer a slot to another owner. Every transfer needs ASAP’s approval.',
    },
    {
      title: 'Earnings vary',
      body: 'What you earn depends on the trips the asset makes. Weeks with fewer trips, repairs or downtime earn less.',
    },
  ]
}
