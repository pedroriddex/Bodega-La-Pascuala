import { randomBytes } from 'node:crypto';
import type { OrderStatus } from '$lib/types/order';

export type PaymentIntentEventType =
	| 'payment_intent.succeeded'
	| 'payment_intent.payment_failed'
	| 'payment_intent.canceled';

const ORDER_PUBLIC_ID_PREFIX = 'ord_';

export function generateOrderPublicId(): string {
	return `${ORDER_PUBLIC_ID_PREFIX}${randomBytes(8).toString('hex')}`;
}

export function generateOrderNumber(date = new Date()): string {
	const stamp = date.toISOString().replace(/\D/g, '').slice(2, 14);
	const suffix = randomBytes(2).toString('hex').toUpperCase();
	return `LP-${stamp}-${suffix}`;
}

export function getOrderStatusFromPaymentEvent(
	currentStatus: OrderStatus,
	eventType: PaymentIntentEventType
): OrderStatus {
	if (eventType === 'payment_intent.succeeded') {
		return currentStatus === 'pending_payment' ? 'paid' : currentStatus;
	}

	if (eventType === 'payment_intent.payment_failed' || eventType === 'payment_intent.canceled') {
		return currentStatus === 'pending_payment' ? 'cancelled' : currentStatus;
	}

	return currentStatus;
}
