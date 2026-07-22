import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeClient } from '$lib/server/sanity/client';
import { getShipdayConfig } from '$lib/server/config';
import { matchesSharedSecret } from '$lib/server/security/shared-secret';
import { mapShipdayEventToOrderStatus } from '$lib/server/shipday/client';
import type { OrderStatus } from '$lib/types/order';

interface StoredOrder {
	_id: string;
	status: OrderStatus;
	orderNumber?: string;
}

const orderQuery = `*[_type == "order" && ((defined(shipdayOrderId) && shipdayOrderId == $shipdayOrderId) || (defined(orderNumber) && orderNumber == $orderNumber))][0]{
  _id,
  status,
  orderNumber
}`;

function readNested(source: unknown, keys: string[]): unknown {
	if (!source || typeof source !== 'object') {
		return undefined;
	}

	const record = source as Record<string, unknown>;
	for (const key of keys) {
		if (record[key] !== undefined && record[key] !== null) {
			return record[key];
		}
	}

	return undefined;
}

/**
 * Shipday's payload field names vary between event types, so read defensively
 * from the documented aliases rather than assuming one exact shape.
 */
function extractEvent(body: Record<string, unknown>): string | undefined {
	const value = readNested(body, ['event', 'eventType', 'order_status', 'orderStatus']);
	return typeof value === 'string' ? value.trim().toUpperCase() : undefined;
}

function extractShipdayOrderId(body: Record<string, unknown>): number | undefined {
	const order = body.order;
	const value =
		readNested(body, ['orderId', 'shipday_order_id', 'shipdayOrderId']) ??
		readNested(order, ['id', 'orderId', 'shipday_order_id']);
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function extractOrderNumber(body: Record<string, unknown>): string | undefined {
	const order = body.order;
	const value =
		readNested(body, ['orderNumber', 'order_number']) ??
		readNested(order, ['orderNumber', 'order_number']);
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Receives Shipday delivery status updates and mirrors them onto the order, so
 * the customer's tracking page reflects what the rider is doing.
 *
 * Answers 200 for anything it cannot act on: Shipday retries on failure and a
 * non-actionable event is not an error.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { shipdayWebhookToken } = getShipdayConfig();
	const providedToken = request.headers.get('token') ?? request.headers.get('x-shipday-token');

	if (!matchesSharedSecret(providedToken, shipdayWebhookToken)) {
		return json({ error: 'Invalid webhook token' }, { status: 401 });
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	const event = extractEvent(body);
	const shipdayOrderId = extractShipdayOrderId(body);
	const orderNumber = extractOrderNumber(body);

	if (!event) {
		console.warn('Shipday webhook received without a recognizable event field');
		return json({ received: true, ignored: true, reason: 'unknown_event' });
	}

	if (!shipdayOrderId && !orderNumber) {
		console.warn(`Shipday webhook "${event}" received without an order identifier`);
		return json({ received: true, ignored: true, reason: 'missing_order_reference' });
	}

	try {
		const order = await writeClient.fetch<StoredOrder | null>(orderQuery, {
			shipdayOrderId: shipdayOrderId ?? -1,
			orderNumber: orderNumber ?? ''
		});

		if (!order) {
			return json({ received: true, ignored: true, reason: 'order_not_found' });
		}

		const nextStatus = mapShipdayEventToOrderStatus(event, order.status);
		if (!nextStatus) {
			return json({ received: true, ignored: true, reason: 'no_status_change', event });
		}

		await writeClient.patch(order._id).set({ status: nextStatus }).commit();

		return json({ received: true, status: nextStatus });
	} catch (error) {
		console.error('Error handling Shipday webhook:', error);
		return json({ error: 'Webhook processing failed' }, { status: 500 });
	}
};
