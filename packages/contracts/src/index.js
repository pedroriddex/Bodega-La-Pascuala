export const ORDER_ITEM_TYPE = Object.freeze({
  half: 'half',
  full: 'full',
  drink: 'drink',
})

export const ORDER_ITEM_TYPE_VALUES = Object.freeze(
  Object.values(ORDER_ITEM_TYPE),
)

export const ORDER_STATUS = Object.freeze({
  pendingPayment: 'pending_payment',
  paid: 'paid',
  preparing: 'preparing',
  shipped: 'shipped',
  completed: 'completed',
  cancelled: 'cancelled',
})

export const ORDER_STATUS_VALUES = Object.freeze(Object.values(ORDER_STATUS))

export const PAYMENT_INTENT_EVENT = Object.freeze({
  succeeded: 'payment_intent.succeeded',
  paymentFailed: 'payment_intent.payment_failed',
  canceled: 'payment_intent.canceled',
})

export const PAYMENT_INTENT_EVENT_VALUES = Object.freeze(
  Object.values(PAYMENT_INTENT_EVENT),
)

/**
 * Shipday delivery events received on the inbound status webhook.
 * Note: `ORDER_PIKEDUP` is Shipday's own spelling, kept verbatim on purpose.
 */
export const SHIPDAY_EVENT = Object.freeze({
  orderAssigned: 'ORDER_ASSIGNED',
  orderAcceptedAndStarted: 'ORDER_ACCEPTED_AND_STARTED',
  orderPickedUp: 'ORDER_PIKEDUP',
  orderOnTheWay: 'ORDER_ONTHEWAY',
  orderCompleted: 'ORDER_COMPLETED',
  orderFailed: 'ORDER_FAILED',
  orderIncomplete: 'ORDER_INCOMPLETE',
})

export const SHIPDAY_EVENT_VALUES = Object.freeze(Object.values(SHIPDAY_EVENT))

export const SHIPDAY_API_BASE_URL = 'https://api.shipday.com'

export const CHECKOUT_INTENT_DOCUMENT_TYPE = 'checkoutIntent'
export const CHECKOUT_INTENT_ID_PREFIX = 'checkoutIntent-'
export const DEFAULT_SANITY_API_VERSION = '2024-03-15'
export const DEFAULT_STUDIO_PREVIEW_URL = 'http://localhost:5173'

export const STRIPE_ORDER_METADATA_KEYS = Object.freeze({
  orderPublicId: 'orderPublicId',
  checkoutIntentId: 'checkoutIntentId',
  orderNumber: 'orderNumber',
})

export const CHECKOUT_INTENT_FIELD_NAMES = Object.freeze([
  'orderPublicId',
  'orderNumber',
  'customer',
  'delivery',
  'items',
  'totalAmount',
  'notes',
  'createdAt',
  'paymentIntentId',
])

export const MONOREPO_ENV_MATRIX = Object.freeze({
  sveltekitApp: Object.freeze({
    public: Object.freeze([
      'PUBLIC_SANITY_PROJECT_ID',
      'PUBLIC_SANITY_DATASET',
      'PUBLIC_SANITY_API_VERSION',
      'PUBLIC_SANITY_STUDIO_URL',
      'PUBLIC_STRIPE_PUBLISHABLE_KEY',
    ]),
    private: Object.freeze([
      'SANITY_API_READ_TOKEN',
      'SANITY_API_WRITE_TOKEN',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'TRACKING_TOKEN_SECRET',
      'SHIPDAY_API_KEY',
      'SHIPDAY_WEBHOOK_TOKEN',
      'SANITY_WEBHOOK_SECRET',
    ]),
  }),
  studio: Object.freeze({
    public: Object.freeze([]),
    private: Object.freeze([
      'SANITY_STUDIO_PROJECT_ID',
      'SANITY_STUDIO_DATASET',
      'SANITY_STUDIO_PREVIEW_URL',
      'SANITY_STUDIO_STUDIO_HOST',
    ]),
  }),
})

export const CHECK_COMMAND_ENV_DEFAULTS = Object.freeze({
  PUBLIC_SANITY_PROJECT_ID: 'demo-project',
  PUBLIC_SANITY_DATASET: 'production',
  PUBLIC_SANITY_API_VERSION: DEFAULT_SANITY_API_VERSION,
  PUBLIC_SANITY_STUDIO_URL: 'http://localhost:3333',
  PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_placeholder',
  SANITY_API_READ_TOKEN: 'sanity-read-token-placeholder',
  SANITY_API_WRITE_TOKEN: 'sanity-write-token-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  TRACKING_TOKEN_SECRET: 'tracking-token-secret-placeholder',
  SHIPDAY_API_KEY: '',
  SHIPDAY_WEBHOOK_TOKEN: '',
  SANITY_WEBHOOK_SECRET: '',
  SANITY_STUDIO_PROJECT_ID: 'demo-project',
  SANITY_STUDIO_DATASET: 'production',
  SANITY_STUDIO_PREVIEW_URL: DEFAULT_STUDIO_PREVIEW_URL,
  SANITY_STUDIO_STUDIO_HOST: '',
})
