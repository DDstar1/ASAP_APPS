import type { Metadata } from 'next'
import { COMPANY, Contact, Email, Group, PolicyPage, Processors, Rights, Section } from '@/components/legal/Policy'

export const metadata: Metadata = {
  title: 'Customer app privacy policy | ASAP',
  description: 'How the ASAP customer app collects, uses and shares your information.',
}

export default function CustomerPrivacy() {
  return (
    <PolicyPage title="ASAP Customer app" updated="October 23, 2026"
      intro={`${COMPANY.name} ("ASAP", "we", "us", "our") operates the ASAP customer app, which lets you request and track deliveries in Nigeria. This policy explains what information the app collects, why, and who it is shared with.`}>

      <Section n={1} title="Who this policy applies to">
        <p>
          This policy applies to people aged 18 and above who use the ASAP customer app (&ldquo;you&rdquo;). By using the app
          you confirm that you are at least 18 years old and agree to the collection and use of your information as described here.
        </p>
      </Section>

      <Section n={2} title="Information we collect">
        <Group title="Account information" items={[
          'Username',
          'Phone number',
          'Email address',
          'Profile photo (optional)',
        ]} />
        <Group title="Location data" items={[
          'Pickup and drop-off points you choose when placing an order',
          'Your precise device location, while the app is open, when you allow location access. It is used to suggest your pickup point and show you on the map.',
          'Places you save as saved locations',
        ]} />
        <Group title="Order and transaction data" items={[
          'Package type, description and declared value',
          'A photo of your package, if you take one when booking',
          'Pickup and drop-off names and coordinates',
          'Order status and timestamps',
          'Pickup and drop-off confirmation codes',
          'Payment references, the amount charged (including any package insurance), refunds and cancellations',
        ]} />
        <Group title="Communications" items={[
          'Messages and images you exchange with your rider in the app for an order',
        ]} />
        <Group title="Device data" items={[
          'A push notification token, so we can send you order updates',
        ]} />
      </Section>

      <Section n={3} title="How we use your information">
        <p>We use your information to:</p>
        <Group items={[
          'Create and manage your account',
          'Match your delivery request to an available rider',
          'Calculate fares from distance and package details, and add package insurance where it applies',
          'Process payments, hold them until delivery and handle refunds',
          'Send you order status notifications',
          'Let you message your rider about your order',
          'Investigate disputes and support requests',
          'Detect fraud and enforce our package policy',
          'Comply with Nigerian law, including the Nigeria Data Protection Act 2023 (NDPA)',
        ]} />
        <p>We do not sell your data or use it for third-party advertising.</p>
      </Section>

      <Section n={4} title="Location data">
        <p>
          We ask for location access only while you are using the app, to suggest your current position as a pickup point and
          show you on the map. We do not collect your location in the background or when the app is closed.
        </p>
      </Section>

      <Section n={5} title="Package insurance">
        <p>
          Some package types are insured automatically, based on the package type and the value you declare. The insurance
          amount is part of your fare and is shown before you pay. We keep the declared value and insurance amount with your order.
        </p>
      </Section>

      <Section n={6} title="Payment data">
        <p>
          Payments are processed by Korapay. We store your payment reference and the amounts charged and refunded. We never
          see or store your card number or banking credentials. Korapay&apos;s own privacy policy applies to the payment itself.
        </p>
      </Section>

      <Section n={7} title="How we share your information">
        <Group items={[
          <><strong className="text-white">With your assigned rider</strong>, for that order only: your name, phone number (so they can call you), pickup and drop-off points, package type, description and photo, and your messages.</>,
          <><strong className="text-white">With our support team</strong>: to investigate disputes and support requests you raise.</>,
          <><strong className="text-white">With regulators or law enforcement</strong>: where Nigerian law or a valid legal order requires it.</>,
        ]} />
        <Processors />
        <p>We do not share your information with anyone else.</p>
      </Section>

      <Section n={8} title="Data retention and deleting your account">
        <p>
          We keep your account data while your account is active. You can delete your account at any time in the app under
          Account, or by emailing <Email />. Order and payment records are kept for at least 5 years after deletion, to meet
          financial record-keeping obligations under Nigerian law.
        </p>
      </Section>

      <Section n={9} title="Your rights under the NDPA"><Rights /></Section>

      <Section n={10} title="Security">
        <p>
          Data is encrypted in transit (TLS), our database restricts each person to their own records, and our servers require
          a signed-in account for every request. No method of transmission over the internet is completely secure. We will
          notify you promptly if we become aware of a breach affecting your personal data.
        </p>
      </Section>

      <Section n={11} title="Children">
        <p>
          The app is not intended for anyone under 18. We do not knowingly collect personal data from anyone under 18. If you
          believe we have, contact us at <Email /> and we will delete it.
        </p>
      </Section>

      <Section n={12} title="Changes to this policy">
        <p>
          We may update this policy. We will tell you about material changes in the app or by email, and the date at the top
          shows when it last changed. Continuing to use the app after changes are posted means you accept the updated policy.
        </p>
      </Section>

      <Section n={13} title="Contact us">
        <p>For any privacy questions, requests or complaints:</p>
        <Contact />
      </Section>
    </PolicyPage>
  )
}
