import { ORDER_STATUS } from '@bodega-la-pascuala/contracts';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeClient } from '$lib/server/sanity/client';
import { getSanityWebhookConfig } from '$lib/server/config';
import { matchesSharedSecret } from '$lib/server/security/shared-secret';
import {
	buildShipdayOrderPayload,
	createShipdayOrder,
	isShipdayConfigured,
	type DispatchableOrder
} from '$lib/server/shipday/client';
import { geocodeDeliveryAddress } from '$lib/server/delivery/radius';
import type { OrderStatus } from '$lib/types/order';

interface StoredDispatchOrder extends DispatchableOrder {
	_id: string;
	status: OrderStatus;
	shipdayOrderId?: number;
}

const orderQuery = `*[_type == "order" && (_id == $id || publicId == $publicId)][0]{
  _id,
  publicId,
  orderNumber,
  status,
  customer,
  delivery,
  items,
  totalAmount,
  notes,
  shipdayOrderId
}`;

/**
 * Triggered by a Sanity webhook when an order reaches `preparing`. Creates the
 * delivery in Shipday so a rider can be dispatched while the food is finished.
 *
 * Always answers 200 for non-actionable cases (pickup orders, wrong status,
 * already dispatched) so Sanity does not keep retrying a no-op.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { sanityWebhookSecret } = getSanityWebhookConfig();
	const providedSecret =
		request.headers.get('x-webhook-secret') ??
		request.headers.get('authorization')?.replace(/^Bearer\s+/iu, '');

	if (!matchesSharedSecret(providedSecret, sanityWebhookSecret)) {
		return json({ error: 'Invalid webhook secret' }, { status: 401 });
	}

	if (!isShipdayConfigured()) {
		return json({ ok: true, ignored: true, reason: 'shipday_not_configured' });
	}

	let body: { _id?: unknown; publicId?: unknown };
	try {
		body = (await request.json()) as { _id?: unknown; publicId?: unknown };
	} catch {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	const documentId = typeof body._id === 'string' ? body._id : undefined;
	const publicId = typeof body.publicId === 'string' ? body.publicId : undefined;
	if (!documentId && !publicId) {
		return json({ error: 'Missing order identifier' }, { status: 400 });
	}

	try {
		// Re-read from Sanity instead of trusting the webhook payload.
		const order = await writeClient.fetch<StoredDispatchOrder | null>(orderQuery, {
			id: documentId ?? '',
			publicId: publicId ?? ''
		});

		if (!order) {
			return json({ ok: true, ignored: true, reason: 'order_not_found' });
		}

		if (order.delivery?.method !== 'delivery') {
			return json({ ok: true, ignored: true, reason: 'pickup_order' });
		}

		if (order.status !== ORDER_STATUS.preparing) {
			return json({ ok: true, ignored: true, reason: 'unexpected_status', status: order.status });
		}

		if (order.shipdayOrderId) {
			return json({ ok: true, ignored: true, reason: 'already_dispatched' });
		}

		// Coordinates make the rider's routing more reliable, but a failure here
		// must not block the dispatch: Shipday geocodes the address on its side.
		let coordinates: { lat: number; lon: number } | null = null;
		const { address, city, zip } = order.delivery;
		if (address && city && zip) {
			coordinates = await geocodeDeliveryAddress({ address, city, zip }).catch(() => null);
		}

		const payload = buildShipdayOrderPayload(order, coordinates);
		const result = await createShipdayOrder(payload);

		if (result.orderId) {
			await writeClient.patch(order._id).set({ shipdayOrderId: result.orderId }).commit();
		}

		return json({ ok: true, dispatched: true, shipdayOrderId: result.orderId ?? null });
	} catch (error) {
		console.error('Error dispatching order to Shipday:', error);
		return json({ error: 'Dispatch failed' }, { status: 500 });
	}
};
