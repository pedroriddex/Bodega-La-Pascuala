import { describe, expect, it } from 'vitest';
import { RequestError } from '$lib/server/http-error';
import { parseCheckoutPayload } from './checkout-payload';

describe('checkout-payload', () => {
	it('parses a valid payload', () => {
		const payload = parseCheckoutPayload({
			items: [{ id: 'abc', type: 'drink', quantity: 2 }],
			customer: {
				firstName: 'Ana',
				lastName: 'Gomez',
				email: 'ana@example.com',
				phone: '600000000'
			},
			delivery: { method: 'pickup' },
			notes: 'Sin hielo'
		});

		expect(payload.items[0]).toEqual({ id: 'abc', type: 'drink', quantity: 2 });
		expect(payload.delivery).toEqual({ method: 'pickup' });
	});

	it('rejects manipulated item payload with unexpected price field', () => {
		expect(() =>
			parseCheckoutPayload({
				items: [{ id: 'abc', type: 'drink', quantity: 2, price: 0.01 }],
				customer: {
					firstName: 'Ana',
					lastName: 'Gomez',
					email: 'ana@example.com',
					phone: '600000000'
				},
				delivery: { method: 'pickup' }
			})
		).toThrowError(RequestError);
	});
});
