import { describe, expect, it } from 'vitest';
import { RequestError } from '$lib/server/http-error';
import { calculateCanonicalOrder, type CatalogProduct } from './catalog';

describe('catalog pricing', () => {
	it('calculates canonical totals from server catalog', () => {
		const products: CatalogProduct[] = [
			{
				_id: 'sandwich-1',
				_type: 'sandwich',
				title: 'Bocadillo Jamón',
				pricing: { halfSize: 4.5, fullSize: 7.25 }
			},
			{
				_id: 'drink-1',
				_type: 'drink',
				title: 'Coca Cola',
				price: 2
			}
		];

		const order = calculateCanonicalOrder(
			[
				{ id: 'sandwich-1', type: 'full', quantity: 2 },
				{ id: 'drink-1', type: 'drink', quantity: 1 }
			],
			products
		);

		expect(order.totalAmountCents).toBe(1650);
		expect(order.totalAmount).toBe(16.5);
		expect(order.items).toHaveLength(2);
	});

	it('rejects unknown items', () => {
		expect(() =>
			calculateCanonicalOrder([{ id: 'missing', type: 'drink', quantity: 1 }], [])
		).toThrowError(RequestError);
	});
});
