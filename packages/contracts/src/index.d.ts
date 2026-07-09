export const ORDER_ITEM_TYPE: Readonly<{
  half: 'half'
  full: 'full'
  drink: 'drink'
}>
export const ORDER_ITEM_TYPE_VALUES: readonly OrderItemType[]
export type OrderItemType = 'half' | 'full' | 'drink'

export const ORDER_STATUS: Readonly<{
  pendingPayment: 'pending_payment'
  paid: 'paid'
  preparing: 'preparing'
  shipped: 'shipped'
  completed: 'completed'
  cancelled: 'cancelled'
}>
export const ORDER_STATUS_VALUES: readonly OrderStatus[]
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'completed'
  | 'cancelled'

export const PAYMENT_INTENT_EVENT: Readonly<{
  succeeded: 'payment_intent.succeeded'
  paymentFailed: 'payment_intent.payment_failed'
  canceled: 'payment_intent.canceled'
}>
export const PAYMENT_INTENT_EVENT_VALUES: readonly PaymentIntentEventType[]
export type PaymentIntentEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'

export const CHECKOUT_INTENT_DOCUMENT_TYPE: 'checkoutIntent'
export const CHECKOUT_INTENT_ID_PREFIX: 'checkoutIntent-'
export const DEFAULT_SANITY_API_VERSION: '2024-03-15'
export const DEFAULT_STUDIO_PREVIEW_URL: 'http://localhost:5173'

export const STRIPE_ORDER_METADATA_KEYS: Readonly<{
  orderPublicId: 'orderPublicId'
  checkoutIntentId: 'checkoutIntentId'
  orderNumber: 'orderNumber'
}>

export const CHECKOUT_INTENT_FIELD_NAMES: readonly [
  'orderPublicId',
  'orderNumber',
  'customer',
  'delivery',
  'items',
  'totalAmount',
  'notes',
  'createdAt',
  'paymentIntentId',
]

export interface CheckoutCustomerFields {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface CheckoutDeliveryFields {
  method: 'pickup' | 'delivery'
  address?: string
  city?: string
  zip?: string
}

export interface CanonicalOrderLine {
  productId: string
  name: string
  quantity: number
  price: number
  type: OrderItemType
  total: number
}

export interface CheckoutIntentDocument {
  _id?: string
  _type: typeof CHECKOUT_INTENT_DOCUMENT_TYPE
  orderPublicId: string
  orderNumber: string
  customer: CheckoutCustomerFields
  delivery: CheckoutDeliveryFields
  items: CanonicalOrderLine[]
  totalAmount: number
  notes?: string
  createdAt: string
  paymentIntentId?: string
}

export const MONOREPO_ENV_MATRIX: Readonly<{
  sveltekitApp: {
    public: readonly string[]
    private: readonly string[]
  }
  studio: {
    public: readonly string[]
    private: readonly string[]
  }
}>

export const CHECK_COMMAND_ENV_DEFAULTS: Readonly<Record<string, string>>
