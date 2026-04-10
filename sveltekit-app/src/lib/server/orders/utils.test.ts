import { describe, expect, it } from 'vitest';
import { getOrderStatusFromPaymentEvent } from './utils';

describe('order status transitions', () => {
	it('moves pending payment to paid on success', () => {
		expect(getOrderStatusFromPaymentEvent('pending_payment', 'payment_intent.succeeded')).toBe(
			'paid'
		);
	});

	it('is idempotent when already paid', () => {
		expect(getOrderStatusFromPaymentEvent('paid', 'payment_intent.succeeded')).toBe('paid');
	});

	it('moves pending payment to cancelled on failure', () => {
		expect(getOrderStatusFromPaymentEvent('pending_payment', 'payment_intent.payment_failed')).toBe(
			'cancelled'
		);
	});
});
