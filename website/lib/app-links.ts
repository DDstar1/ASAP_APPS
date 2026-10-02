// Store listings for the mobile apps. The App Store URLs need the numeric
// Apple ID (App Store Connect → App Information), so they come from env and
// the matching button stays hidden until set.
export const RIDER_APP_STORE_URL = process.env.NEXT_PUBLIC_RIDER_APP_STORE_URL
export const CUSTOMER_APP_STORE_URL = process.env.NEXT_PUBLIC_CUSTOMER_APP_STORE_URL

export const RIDER_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ddhaven.asap_rider'
export const CUSTOMER_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ddhaven.asap_customer'

// Numeric Apple ID of the customer app, for the iOS Safari smart app banner.
export const CUSTOMER_APPLE_APP_ID = process.env.NEXT_PUBLIC_CUSTOMER_APPLE_APP_ID
