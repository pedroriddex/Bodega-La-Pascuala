import { describe, expect, it, vi } from 'vitest';
import { ORDER_STATUS, SHIPDAY_EVENT } from '@bodega-la-pascuala/contracts';
import { STORE_LOCATION } from '$lib/config/delivery';

vi.mock('$lib/server/config', () => ({
	getShipdayConfig: () => ({ shipdayApiKey: 'test-key', shipdayWebhookToken: 'test-token' })
}));

import { buildShipdayOrderPayload, mapShipdayEventToOrderStatus } from './client';

function buildOrder(overrides = {}) {
	return {
		publicId: 'ord_abc',
		orderNumber: 'LP-240101-AB',
		customer: {
			firstName: 'Ana',
			lastName: 'Ruiz',
			email: 'ana@example.com',
			phone: '600123456'
		},
		delivery: {
			method: 'delivery',
			address: 'Carrer de Test, 1',
			city: 'València',
			zip: '46011'
		},
		items: [
			{
				productId: 'sw1',
				name: 'Brascada',
				quantity: 2,
				price: 8.25,
				type: 'half' as const,
				total: 16.5
			}
		],
		totalAmount: 16.5,
		notes: 'Sin cebolla',
		...overrides
	};
}

describe('buildShipdayOrderPayload', () => {
	it('maps the order onto Shipday fields', () => {
		const payload = buildShipdayOrderPayload(buildOrder());

		expect(payload.orderNumber).toBe('LP-240101-AB');
		expect(payload.customerName).toBe('Ana Ruiz');
		expect(payload.customerAddress).toBe('Carrer de Test, 1, 46011, València');
		expect(payload.customerPhoneNumber).toBe('600123456');
		expect(payload.customerEmail).toBe('ana@example.com');
		expect(payload.deliveryInstruction).toBe('Sin cebolla');
		expect(payload.totalOrderCost).toBe(16.5);
		expect(payload.orderItem).toEqual([{ name: 'Brascada', unitPrice: 8.25, quantity: 2 }]);
	});

	it('uses the store as the pickup point', () => {
		const payload = buildShipdayOrderPayload(buildOrder());

		expect(payload.restaurantName).toBe(STORE_LOCATION.name);
		expect(payload.restaurantAddress).toBe(STORE_LOCATION.address);
		expect(payload.pickupLatitude).toBe(STORE_LOCATION.lat);
		expect(payload.pickupLongitude).toBe(STORE_LOCATION.lon);
	});

	it('always marks the order as already paid so riders never collect cash', () => {
		expect(buildShipdayOrderPayload(buildOrder()).paymentMethod).toBe('credit_card');
	});

	it('includes delivery coordinates only when they are known', () => {
		expect(buildShipdayOrderPayload(buildOrder()).deliveryLatitude).toBeUndefined();

		const located = buildShipdayOrderPayload(buildOrder(), { lat: 39.47, lon: -0.32 });
		expect(located.deliveryLatitude).toBe(39.47);
		expect(located.deliveryLongitude).toBe(-0.32);
	});

	it('omits optional fields that are empty', () => {
		const payload = buildShipdayOrderPayload(
			buildOrder({ notes: '   ', customer: { firstName: 'Ana', lastName: '', phone: '600' } })
		);

		expect(payload.deliveryInstruction).toBeUndefined();
		expect(payload.customerEmail).toBeUndefined();
		expect(payload.customerName).toBe('Ana');
	});
});

describe('mapShipdayEventToOrderStatus', () => {
	it('moves a preparing order to shipped when the rider is on the way', () => {
		expect(mapShipdayEventToOrderStatus(SHIPDAY_EVENT.orderOnTheWay, ORDER_STATUS.preparing)).toBe(
			ORDER_STATUS.shipped
		);
	});

	it('completes the order when Shipday reports delivery', () => {
		expect(mapShipdayEventToOrderStatus(SHIPDAY_EVENT.orderCompleted, ORDER_STATUS.shipped)).toBe(
			ORDER_STATUS.completed
		);
	});

	it('never moves an order backwards', () => {
		expect(
			mapShipdayEventToOrderStatus(SHIPDAY_EVENT.orderOnTheWay, ORDER_STATUS.completed)
		).toBeNull();
	});

	it('ignores events that do not change the status', () => {
		expect(
			mapShipdayEventToOrderStatus(SHIPDAY_EVENT.orderOnTheWay, ORDER_STATUS.shipped)
		).toBeNull();
		expect(
			mapShipdayEventToOrderStatus(SHIPDAY_EVENT.orderAssigned, ORDER_STATUS.preparing)
		).toBeNull();
	});

	it('leaves cancelled orders and failed deliveries to a human', () => {
		expect(
			mapShipdayEventToOrderStatus(SHIPDAY_EVENT.orderCompleted, ORDER_STATUS.cancelled)
		).toBeNull();
		expect(
			mapShipdayEventToOrderStatus(SHIPDAY_EVENT.orderFailed, ORDER_STATUS.shipped)
		).toBeNull();
	});

	it('ignores unknown events', () => {
		expect(mapShipdayEventToOrderStatus('SOMETHING_ELSE', ORDER_STATUS.preparing)).toBeNull();
	});
});
