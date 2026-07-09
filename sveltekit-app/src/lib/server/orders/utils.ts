import {
	ORDER_STATUS,
	PAYMENT_INTENT_EVENT,
	type OrderStatus,
	type PaymentIntentEventType
} from '@bodega-la-pascuala/contracts';
import { randomBytes } from 'node:crypto';

const ORDER_PUBLIC_ID_PREFIX = 'ord_';

export type { PaymentIntentEventType };

export function generateOrderPublicId(): string {
	return `${ORDER_PUBLIC_ID_PREFIX}${randomBytes(8).toString('hex')}`;
}

export function generateOrderNumber(date = new Date()): string {
	const stamp = date.toISOString().replace(/\D/g, '').slice(2, 14);
	const suffix = randomBytes(2).toString('hex').toUpperCase();
	return `LP-${stamp}-${suffix}`;
}

/**
 * Resolve the next order status from a Stripe payment event.
 *
 * Orders are only ever materialized once payment has already succeeded (see
 * `upsertPaidOrderFromCheckoutIntent`), so in practice orders never live in
 * `pending_payment`. This function is deliberately conservative: it only reacts
 * to events while an order is still `pending_payment`. That guarantees a late or
 * out-of-order `payment_failed`/`canceled` event (e.g. from a superseded payment
 * attempt) can never revert an order that is already `paid` or further along its
 * fulfilment lifecycle — those transitions are handled operationally (refunds).
 */
export function getOrderStatusFromPaymentEvent(
	currentStatus: OrderStatus,
	eventType: PaymentIntentEventType
): OrderStatus {
	if (eventType === PAYMENT_INTENT_EVENT.succeeded) {
		return currentStatus === ORDER_STATUS.pendingPayment ? ORDER_STATUS.paid : currentStatus;
	}

	if (
		eventType === PAYMENT_INTENT_EVENT.paymentFailed ||
		eventType === PAYMENT_INTENT_EVENT.canceled
	) {
		return currentStatus === ORDER_STATUS.pendingPayment ? ORDER_STATUS.cancelled : currentStatus;
	}

	return currentStatus;
}
