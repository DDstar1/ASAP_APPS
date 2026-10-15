// Shown (and accepted) before a store is created. The order rules here mirror
// the database: 48h response window, 1h pickup window, 5 strikes suspend the
// bot (supabase/migrations/20261014124000_telegram_order_timeouts.sql).

export const STRIKE_LIMIT = 5

export const VENDOR_GUIDELINES: { title: string; points: string[] }[] = [
  {
    title: 'Responding to orders',
    points: [
      'Accept or decline every new order on the Orders page within 48 hours. Orders with no response are cancelled and the customer is refunded.',
      'Only accept orders you can fulfil. If you can\'t, tap "Can\'t fulfil". The order is cancelled and the customer is refunded.',
    ],
  },
  {
    title: 'Pickup',
    points: [
      'Have the order packed and ready when a rider is assigned. The rider\'s name and phone appear on the order.',
      'The order must be picked up within 1 hour of a rider being assigned, or it is cancelled and the customer is refunded.',
      'Hand the order only to the assigned rider, once the pickup code is confirmed.',
    ],
  },
  {
    title: 'Strikes and bot suspension',
    points: [
      'Every order cancelled on your side counts as a strike against that store: "Can\'t fulfil", no response within 48 hours, or no pickup within 1 hour.',
      `${STRIKE_LIMIT} strikes switch off and suspend the store's Telegram bot. You can't switch it back on yourself. Only a call to ASAP support can reinstate it.`,
    ],
  },
  {
    title: 'Stock, prices and menu',
    points: [
      'Keep stock accurate and update it as soon as items run out. Most declined orders come from stock that isn\'t up to date.',
      'The prices you set are what customers pay. Use real photos and honest descriptions.',
      'Don\'t list illegal, unsafe, counterfeit or expired items.',
    ],
  },
  {
    title: 'Store details',
    points: [
      'Keep your opening hours, address, map pin and phone number current. Riders and customers rely on them.',
      'Answer calls from riders and customers about live orders.',
    ],
  },
  {
    title: 'Payouts',
    points: [
      'Each store is paid to its own bank account. Payment for an order is released once it\'s delivered.',
      'Double-check your bank details. Wrong details delay payouts.',
    ],
  },
  {
    title: 'Escrow, delivery and disputes',
    points: [
      'Zazu holds every customer payment in escrow from the moment the order is placed until the customer confirms delivery by entering the drop-off code.',
      'If an order isn\'t delivered, or is lost or damaged in transit, Zazu refunds the customer in full from the escrowed funds.',
      'Once the customer enters the drop-off code, Zazu\'s liability for the order ends. Any later dispute about the item\'s quality, condition or the customer\'s satisfaction is between you and the customer.',
      'If you believe an item was damaged in transit, raise a dispute within 24 hours of delivery, with photos taken at dispatch and at receipt. Zazu reviews each dispute and decides liability case by case.',
    ],
  },
  {
    title: 'Your Telegram bot',
    points: [
      'Each store gets its own Telegram bot. Customers order from it, and it only sells that store\'s stock.',
      'You can switch your bot off at any time from the Bot page. ASAP manages the bot itself, so no one needs a bot token.',
    ],
  },
]
