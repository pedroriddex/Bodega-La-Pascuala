import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CHECKOUT_INTENT_DOCUMENT_TYPE,
  CHECKOUT_INTENT_FIELD_NAMES,
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  STRIPE_ORDER_METADATA_KEYS,
} from '@bodega-la-pascuala/contracts'

import checkoutIntentSchema from '../studio/schemas/checkoutIntent.ts'
import orderSchema from '../studio/schemas/order.tsx'

function getFieldNames(schema: { fields?: Array<{ name?: string }> }) {
  return (schema.fields ?? []).map((field) => field.name).filter(Boolean)
}

test('order schema keeps the shared status contract', () => {
  const statusField = orderSchema.fields?.find(
    (field) => field.name === 'status',
  )

  assert.ok(statusField, 'status field must exist in the order schema')
  assert.deepEqual(
    statusField.options?.list?.map((option: { value: string }) => option.value),
    [...ORDER_STATUS_VALUES],
  )
  assert.equal(statusField.initialValue, ORDER_STATUS.pendingPayment)
})

test('order schema keeps the materialized order shape', () => {
  assert.deepEqual(getFieldNames(orderSchema), [
    'quickStatusActions',
    'publicId',
    'orderNumber',
    'customer',
    'delivery',
    'notes',
    'items',
    'totalAmount',
    'status',
    'paymentIntentId',
    'stripePaymentId',
    'shipdayOrderId',
    'createdAt',
  ])
})

test('checkout intent schema mirrors the shared contract', () => {
  assert.equal(checkoutIntentSchema.name, CHECKOUT_INTENT_DOCUMENT_TYPE)
  assert.deepEqual(getFieldNames(checkoutIntentSchema), [
    ...CHECKOUT_INTENT_FIELD_NAMES,
  ])
})

test('stripe metadata keys remain canonical', () => {
  assert.deepEqual(
    Object.values(STRIPE_ORDER_METADATA_KEYS).sort(),
    ['checkoutIntentId', 'orderNumber', 'orderPublicId'].sort(),
  )
})
