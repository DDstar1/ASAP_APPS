# Store submission: ASAP Customer and ASAP Rider

What to enter in App Store Connect and the Google Play Console for both apps. The privacy
answers below match the published policies; if an app starts collecting something new, update
the policy and these answers together.

## Before you start

- [ ] Apple Developer Program account (adrianovwigho06@gmail.com) and Google Play developer account
- [ ] Production Rust server on **https** (iOS blocks plain http in release builds)
- [ ] EAS environment variables for the `production` environment of both projects:
      `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_API_KEY`, `RUST_API_URL` (the https URL),
      `WEBSITE_URL` (optional; defaults to https://asap-apps.vercel.app) and the
      `GOOGLE_SERVICES_JSON` file variable (Android push)
- [ ] In both `eas.json` files, replace `ascAppId` and `appleTeamId` once the apps exist in App Store Connect
- [ ] Run `npx expo install --fix` in both apps and make a test build before the store build
- [ ] Create the reviewer demo accounts (see below)

## Shared listing details

| Field | Value |
|---|---|
| Developer / seller | ASAP Group of Companies |
| Support email | asap.support.team@gmail.com |
| Support phone | +234 704 203 6840 |
| Support URL | https://asap-apps.vercel.app |
| Account deletion URL (Google asks for a web link) | https://asap-apps.vercel.app/delete-account |
| Age rating | 18+ in the description; content questionnaire: no objectionable content |
| Country | Nigeria |
| Encryption (Apple) | Uses only standard HTTPS: `ITSAppUsesNonExemptEncryption` is already `false` |

| | ASAP Customer | ASAP Rider |
|---|---|---|
| Bundle ID / package | `com.ddhaven.asapcustomer` / `com.ddhaven.asap_customer` | `com.ddhaven.asaprider` / `com.ddhaven.asap_rider` |
| Privacy policy URL | https://asap-apps.vercel.app/privacy/customer | https://asap-apps.vercel.app/privacy/rider |
| Category | Lifestyle (or Travel) | Business |

## Reviewer demo accounts

Both apps require sign-in, so each store needs a working login. Use accounts made only for
review, never a real customer's or rider's.

- **Customer:** an ordinary customer account with a phone number set.
- **Rider:** an approved driver (a `back_drivers` row with a vehicle and payout details), so the
  reviewer reaches the home screen and can go online.

Put the email and password in Apple's "Sign-in required" fields and Google's "App access"
section. They can't easily complete a real paid delivery, so describe the flow in the notes
below and consider attaching a short screen recording.

## Apple App Store

### App Privacy ("Data used to track you": none for both apps)

All data below is **linked to the user**, used for **App Functionality**, and **not used for tracking**.

| Data type | Customer | Rider |
|---|---|---|
| Contact info: name, email, phone number | Yes | Yes |
| Location: precise location | Yes | Yes |
| User content: photos | Yes (package and chat photos) | Yes (handover, dispute and chat photos) |
| User content: other (chat messages) | Yes | Yes |
| Identifiers: user ID | Yes | Yes |
| Purchases: purchase history | Yes (orders and payments) | No |
| Financial info: other (bank account for payouts) | No | Yes |
| Usage data: product interaction (trips, time online) | No | Yes |

Card details are entered on Korapay's page, never in the app, so payment card info is **not** collected.

### Review notes: Customer

> ASAP Customer books same-day package deliveries in Nigeria. Sign in with the demo account
> above, set a pickup and drop-off, choose the package type and details, and you'll see the price.
> Payment opens Korapay's secure web checkout. The service is a physical delivery carried out by
> a rider, so it is paid outside In-App Purchase (guideline 3.1.3(e)). Location is used only
> while the app is open, to set the pickup point. Account deletion: Account → Delete account.

### Review notes: Rider

> ASAP Rider is for approved delivery riders. Sign in with the demo rider account and switch to
> Online on the home screen to receive delivery requests.
>
> **Background location:** when a rider accepts a delivery, the app keeps sending their location
> while the delivery is in progress, even if the app is in the background, so the customer can
> follow the package live. Before asking for "Always" permission the app explains this in its
> own dialog, iOS shows the blue location indicator while tracking runs, and tracking stops when
> the delivery is completed. No location is collected while the rider is offline.
> Account deletion: Profile → Delete account.

## Google Play

### Data safety

Same data types as the Apple table. For both apps:

- Data is **encrypted in transit**: yes
- Users can **request deletion**: yes, in the app and at the account deletion URL above
- Data **shared** with third parties: no. Supabase, Korapay, Google Maps and the push services
  are service providers acting on our behalf, which Google does not count as sharing.
- Location: **precise**; Customer: collected only while the app is in use. Rider: collected in
  the **background** too (see the declaration below).

### Background location declaration (Rider only)

Play Console → App content → Sensitive permissions → Location.

- **Feature:** live delivery tracking for customers.
- **Description to paste:**
  > While a rider has an active delivery, ASAP Rider collects their location in the background,
  > including when the app is closed or not in use, so the customer can track their package in
  > real time. Collection starts when the rider accepts a delivery and stops when it is completed.
  > The app shows a disclosure explaining this before requesting the permission.
- **Video (required):** a 30 to 60 second phone recording showing:
  1. accepting a delivery,
  2. the in-app "Share your location during deliveries" dialog, then the system prompt (choose "Allow all the time"),
  3. the app in the background with the "Delivery in Progress" notification,
  4. completing the delivery and the notification disappearing.

  Upload it to YouTube as unlisted and paste the link.

### Other Play Console declarations

- **Financial features:** none in the apps. (Investment is website-only while
  `SHOW_INVEST` is `false` in each app's `constants/features.ts`.)
- **Foreground service** (Rider, Android 14+): type `location`, used for the active-delivery tracking above.
- **First upload:** Google requires the first app bundle to be uploaded by hand in the Play
  Console; `eas submit` works after that, using a service account key saved as
  `google-play-service-account.json` next to each `eas.json` (don't commit it).
