import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORDER_STATUS } from '@bodega-la-pascuala/contracts';

const mocks = vi.hoisted(() => {
	const commit = vi.fn();
	const set = vi.fn(() => ({ commit }));
	const patch = vi.fn(() => ({ set }));
	const createIfNotExists = vi.fn();
	const del = vi.fn();
	const fetch = vi.fn();
	return {
		commit,
		set,
		patch,
		createIfNotExists,
		del,
		fetch,
		writeClient: { commit, set, patch, createIfNotExists, delete: del, fetch }
	};
});

vi.mock('$lib/server/sanity/client', () => ({ writeClient: mocks.writeClient }));

import { upsertPaidOrderFromCheckoutIntent } from './payment-materialization';

function buildCheckoutIntent() {
	return {
		_id: 'checkoutIntent-ord_abc123',
		_type: 'checkoutIntent' as const,
		orderPublicId: 'ord_abc123',
		orderNumber: 'LP-240101-AB',
		customer: { firstName: 'Ana', lastName: 'Ruiz', email: 'a@b.com', phone: '600000000' },
		delivery: { method: 'pickup' as const },
		items: [
			{
				productId: 'sw1',
				name: 'Bocata',
				quantity: 2,
				price: 3.5,
				type: 'full' as const,
				total: 7
			},
			{ productId: 'dr1', name: 'Agua', quantity: 1, price: 1, type: 'drink' as const, total: 1 }
		],
		totalAmount: 8,
		notes: '',
		createdAt: '2024-01-01T10:00:00.000Z'
	};
}

describe('upsertPaidOrderFromCheckoutIntent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.commit.mockResolvedValue({});
		mocks.createIfNotExists.mockResolvedValue({});
		mocks.del.mockResolvedValue({});
	});

	it('materializes a paid order with a deterministic id and unique item keys', async () => {
		await upsertPaidOrderFromCheckoutIntent(buildCheckoutIntent(), 'pi_123');

		expect(mocks.createIfNotExists).toHaveBeenCalledTimes(1);
		const created = mocks.createIfNotExists.mock.calls[0][0];
		expect(created._id).toBe('order-ord_abc123');
		expect(created._type).toBe('order');
		expect(created.status).toBe(ORDER_STATUS.paid);
		expect(created.publicId).toBe('ord_abc123');
		expect(created.paymentIntentId).toBe('pi_123');

		const keys = created.items.map((item: { _key?: string }) => item._key);
		expect(keys.every((key: string | undefined) => typeof key === 'string' && key.length > 0)).toBe(
			true
		);
		expect(new Set(keys).size).toBe(keys.length);

		expect(mocks.patch).toHaveBeenCalledWith('order-ord_abc123');
		expect(mocks.del).toHaveBeenCalledWith('checkoutIntent-ord_abc123');
	});

	it('is idempotent: the same public id always targets the same order document', async () => {
		await upsertPaidOrderFromCheckoutIntent(buildCheckoutIntent(), 'pi_123');
		await upsertPaidOrderFromCheckoutIntent(buildCheckoutIntent(), 'pi_123');

		const ids = mocks.createIfNotExists.mock.calls.map((call) => call[0]._id);
		expect(ids).toEqual(['order-ord_abc123', 'order-ord_abc123']);
		// The intent is cleaned up on every run; a second delete is a harmless no-op.
		expect(mocks.del).toHaveBeenCalledTimes(2);
	});
});
