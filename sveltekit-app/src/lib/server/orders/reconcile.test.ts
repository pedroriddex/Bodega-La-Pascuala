import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	const retrieve = vi.fn();
	const findOrder = vi.fn();
	const findCheckoutIntent = vi.fn();
	const upsertPaidOrderFromCheckoutIntent = vi.fn();
	return { retrieve, findOrder, findCheckoutIntent, upsertPaidOrderFromCheckoutIntent };
});

vi.mock('stripe', () => ({
	default: vi.fn().mockImplementation(() => ({ paymentIntents: { retrieve: mocks.retrieve } }))
}));

vi.mock('$lib/server/config', () => ({
	getStripeClientConfig: () => ({ stripeSecretKey: 'sk_test_placeholder' })
}));

vi.mock('$lib/server/orders/payment-materialization', () => ({
	findOrder: mocks.findOrder,
	findCheckoutIntent: mocks.findCheckoutIntent,
	upsertPaidOrderFromCheckoutIntent: mocks.upsertPaidOrderFromCheckoutIntent
}));

import { reconcilePaidOrder } from './reconcile';

describe('reconcilePaidOrder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns true without touching Stripe when the order already exists', async () => {
		mocks.findOrder.mockResolvedValue({ _id: 'order-ord_1', status: 'paid' });

		await expect(reconcilePaidOrder('ord_1')).resolves.toBe(true);
		expect(mocks.retrieve).not.toHaveBeenCalled();
		expect(mocks.upsertPaidOrderFromCheckoutIntent).not.toHaveBeenCalled();
	});

	it('returns false when there is no checkout intent to promote', async () => {
		mocks.findOrder.mockResolvedValue(null);
		mocks.findCheckoutIntent.mockResolvedValue(null);

		await expect(reconcilePaidOrder('ord_2')).resolves.toBe(false);
		expect(mocks.upsertPaidOrderFromCheckoutIntent).not.toHaveBeenCalled();
	});

	it('materializes the order when the PaymentIntent has succeeded', async () => {
		mocks.findOrder.mockResolvedValue(null);
		mocks.findCheckoutIntent.mockResolvedValue({
			_id: 'checkoutIntent-ord_3',
			paymentIntentId: 'pi_3'
		});
		mocks.retrieve.mockResolvedValue({ id: 'pi_3', status: 'succeeded' });

		await expect(reconcilePaidOrder('ord_3')).resolves.toBe(true);
		expect(mocks.upsertPaidOrderFromCheckoutIntent).toHaveBeenCalledWith(
			expect.objectContaining({ _id: 'checkoutIntent-ord_3' }),
			'pi_3'
		);
	});

	it('does not materialize when the PaymentIntent has not succeeded', async () => {
		mocks.findOrder.mockResolvedValue(null);
		mocks.findCheckoutIntent.mockResolvedValue({
			_id: 'checkoutIntent-ord_4',
			paymentIntentId: 'pi_4'
		});
		mocks.retrieve.mockResolvedValue({ id: 'pi_4', status: 'requires_payment_method' });

		await expect(reconcilePaidOrder('ord_4')).resolves.toBe(false);
		expect(mocks.upsertPaidOrderFromCheckoutIntent).not.toHaveBeenCalled();
	});
});
