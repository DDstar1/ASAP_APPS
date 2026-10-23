import type { Metadata } from 'next'
import { COMPANY, Contact, Email, Group, PolicyPage, Processors, Rights, Section } from '@/components/legal/Policy'

export const metadata: Metadata = {
  title: 'Rider app privacy policy | ASAP',
  description: 'How the ASAP rider app collects, uses and shares your information, including location.',
}

export default function RiderPrivacy() {
  return (
    <PolicyPage title="ASAP Rider app" updated="October 23, 2026"
      intro={`${COMPANY.name} ("ASAP", "we", "us", "our") operates the ASAP rider app, which lets delivery riders receive, accept and complete delivery orders in Nigeria. This policy explains what information the app collects, why, and who it is shared with.`}>

      <Section n={1} title="Who this policy applies to">
        <p>
          This policy applies to people aged 18 and above who register and work as delivery riders on ASAP (&ldquo;you&rdquo;).
          By using the app you confirm that you are at least 18 years old and agree to the collection and use of your
          information as described here.
        </p>
      </Section>

      <Section n={2} title="Information we collect">
        <Group title="Account and identity information" items={[
          'Name and username',
          'Email address',
          'Phone number',
          'Profile photo',
        ]} />
        <Group title="Verification and vehicle information" items={[
          'Vehicle type, vehicle name and plate number',
          'Driver’s licence number (where applicable)',
          'If you apply to ride an ASAP-owned vehicle: your National Identification Number (NIN), area, riding experience, and a guarantor’s name and phone number',
        ]} />
        <Group title="Location data" items={[
          'Your precise location while you are online in the app, used to send you nearby orders',
          'Your location during an active delivery, including when the app is closed or not in use (see section 4)',
          'Your position when you accept an order',
        ]} />
        <Group title="Photos" items={[
          'Photos of packages you take at pickup and delivery as proof of handover',
          'Photos you submit when reporting a package problem',
          'Images you send in chat',
        ]} />
        <Group title="Order and trip data" items={[
          'Orders offered to you and your responses (accepted, declined or expired)',
          'Trip status and timestamps, and the pickup and drop-off codes you enter',
          'Distance travelled, fares and earnings per trip',
        ]} />
        <Group title="Earnings and payout data" items={[
          'Your bank name, account name and account number for payouts',
          'Each trip’s fare split (your share, the platform’s share and, for ASAP-owned vehicles, the asset owners’ share)',
          'Your earnings and payout history',
        ]} />
        <Group title="Performance data" items={[
          'Time online and time on trips',
          'Trips completed and cancelled',
          'Offer acceptance rate',
          'Disputes raised and their outcomes',
        ]} />
        <Group title="Device data" items={[
          'A push notification token, so we can send you new orders',
        ]} />
      </Section>

      <Section n={3} title="How we use your information">
        <p>We use your information to:</p>
        <Group items={[
          'Create and verify your rider account',
          'Send you delivery orders based on your location and availability',
          'Show customers your live position during their delivery',
          'Confirm pickups and drop-offs with handover codes and photos',
          'Calculate and pay your earnings',
          'Investigate disputes, fraud and policy violations',
          'Send you notifications about new orders and your account',
          'Comply with Nigerian law, including the Nigeria Data Protection Act 2023 (NDPA)',
        ]} />
      </Section>

      <Section n={4} title="Location data">
        <p>Location is central to how ASAP works, so we collect it in two situations:</p>
        <Group items={[
          <><strong className="text-white">While you are online.</strong> When the app is open and you are online, we collect your location so we can match you to nearby orders.</>,
          <><strong className="text-white">During an active delivery, in the background.</strong> From the moment you accept an order until it is delivered, we collect your location even when the app is closed or not in use, so the customer can follow their package live. Your phone shows that location is in use while this runs. It stops as soon as the delivery ends.</>,
        ]} />
        <p>
          We do not collect your location when you are offline and have no active delivery. You can go offline at any time
          except during a delivery. The app asks for background location permission before your first delivery, and you can
          decline it; deliveries then work only while the app is open.
        </p>
      </Section>

      <Section n={5} title="Bank and payout data">
        <p>
          Your bank details are used only to pay your earnings. We store your bank name, account name and account number. We
          never store card numbers or banking passwords. Payouts are made through Korapay, whose own terms and privacy policy apply.
        </p>
      </Section>

      <Section n={6} title="How we share your information">
        <Group items={[
          <><strong className="text-white">With customers</strong>, during their delivery only: your name, phone number, vehicle, licence number, number of completed rides and live location.</>,
          <><strong className="text-white">With asset owners</strong>, for ASAP-owned vehicles: trip counts, distance and earnings for the vehicle, never your name or contact details.</>,
          <><strong className="text-white">With our support team</strong>: to investigate disputes and support requests.</>,
          <><strong className="text-white">With regulators or law enforcement</strong>: where Nigerian law or a valid legal order requires it.</>,
        ]} />
        <Processors />
        <p>We do not share your information with anyone else.</p>
      </Section>

      <Section n={7} title="Data retention and deleting your account">
        <p>
          We keep your account data while your account is active. You can delete your account at any time in the app under
          Profile, or by emailing <Email />. Trip, earnings and payout records are kept for at least 5 years after deletion, to
          meet financial and tax record-keeping obligations under Nigerian law.
        </p>
      </Section>

      <Section n={8} title="Your rights under the NDPA"><Rights /></Section>

      <Section n={9} title="Security">
        <p>
          Data, including your location, is encrypted in transit (TLS). Our database restricts each person to their own
          records, and our servers require a signed-in account for every request. We will notify you promptly if we become
          aware of a breach affecting your personal data.
        </p>
      </Section>

      <Section n={10} title="Children">
        <p>
          The app is not intended for anyone under 18. We do not knowingly collect personal data from anyone under 18. If you
          believe we have, contact us at <Email /> and we will delete it.
        </p>
      </Section>

      <Section n={11} title="Changes to this policy">
        <p>
          We may update this policy. We will tell you about material changes in the app or by email, and the date at the top
          shows when it last changed. Continuing to use the app after changes are posted means you accept the updated policy.
        </p>
      </Section>

      <Section n={12} title="Contact us">
        <p>For any privacy questions, requests or complaints:</p>
        <Contact />
      </Section>
    </PolicyPage>
  )
}
