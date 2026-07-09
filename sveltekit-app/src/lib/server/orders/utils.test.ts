import { ORDER_STATUS, PAYMENT_INTENT_EVENT } from '@bodega-la-pascuala/contracts';
import { describe, expect, it } from 'vitest';
import { getOrderStatusFromPaymentEvent } from './utils';

describe('order status transitions', () => {
	it('moves pending payment to paid on success', () => {
		expect(
			getOrderStatusFromPaymentEvent(ORDER_STATUS.pendingPayment, PAYMENT_INTENT_EVENT.succeeded)
		).toBe(ORDER_STATUS.paid);
	});

	it('is idempotent when already paid', () => {
		expect(getOrderStatusFromPaymentEvent(ORDER_STATUS.paid, PAYMENT_INTENT_EVENT.succeeded)).toBe(
			ORDER_STATUS.paid
		);
	});

	it('moves pending payment to cancelled on failure', () => {
		expect(
			getOrderStatusFromPaymentEvent(
				ORDER_STATUS.pendingPayment,
				PAYMENT_INTENT_EVENT.paymentFailed
			)
		).toBe(ORDER_STATUS.cancelled);
	});

	it('never reverts an already paid order on a late failed/canceled event', () => {
		expect(
			getOrderStatusFromPaymentEvent(ORDER_STATUS.paid, PAYMENT_INTENT_EVENT.paymentFailed)
		).toBe(ORDER_STATUS.paid);
		expect(getOrderStatusFromPaymentEvent(ORDER_STATUS.paid, PAYMENT_INTENT_EVENT.canceled)).toBe(
			ORDER_STATUS.paid
		);
	});

	it('does not touch orders past payment (preparing/shipped) on payment events', () => {
		expect(
			getOrderStatusFromPaymentEvent(ORDER_STATUS.preparing, PAYMENT_INTENT_EVENT.canceled)
		).toBe(ORDER_STATUS.preparing);
		expect(
			getOrderStatusFromPaymentEvent(ORDER_STATUS.shipped, PAYMENT_INTENT_EVENT.succeeded)
		).toBe(ORDER_STATUS.shipped);
	});
});
