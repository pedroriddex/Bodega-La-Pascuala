import {
	ORDER_STATUS,
	SHIPDAY_API_BASE_URL,
	SHIPDAY_EVENT,
	type ShipdayEventType
} from '@bodega-la-pascuala/contracts';
import { STORE_LOCATION } from '$lib/config/delivery';
import { getShipdayConfig } from '$lib/server/config';
import { RequestError } from '$lib/server/http-error';
import type { CanonicalOrderItem, OrderStatus } from '$lib/types/order';

export interface DispatchableOrder {
	publicId: string;
	orderNumber: string;
	customer: { firstName?: string; lastName?: string; email?: string; phone?: string };
	delivery: { method: string; address?: string; city?: string; zip?: string };
	items: CanonicalOrderItem[];
	totalAmount: number;
	notes?: string;
}

export interface ShipdayOrderPayload {
	orderNumber: string;
	customerName: string;
	customerAddress: string;
	customerPhoneNumber: string;
	customerEmail?: string;
	restaurantName: string;
	restaurantAddress: string;
	pickupLatitude: number;
	pickupLongitude: number;
	deliveryLatitude?: number;
	deliveryLongitude?: number;
	orderItem: Array<{ name: string; unitPrice: number; quantity: number }>;
	totalOrderCost: number;
	deliveryInstruction?: string;
	paymentMethod: 'credit_card';
	orderSource: string;
}

export function isShipdayConfigured(): boolean {
	return Boolean(getShipdayConfig().shipdayApiKey);
}

function formatCustomerName(customer: DispatchableOrder['customer']): string {
	const name = `${customer.firstName?.trim() ?? ''} ${customer.lastName?.trim() ?? ''}`.trim();
	return name.length > 0 ? name : 'Cliente';
}

function formatDeliveryAddress(delivery: DispatchableOrder['delivery']): string {
	return [delivery.address?.trim(), delivery.zip?.trim(), delivery.city?.trim()]
		.filter((part) => Boolean(part && part.length > 0))
		.join(', ');
}

/**
 * Build the Shipday payload from a materialized order. Pure on purpose so the
 * mapping can be asserted in tests without touching the network.
 */
export function buildShipdayOrderPayload(
	order: DispatchableOrder,
	deliveryCoordinates?: { lat: number; lon: number } | null
): ShipdayOrderPayload {
	const payload: ShipdayOrderPayload = {
		orderNumber: order.orderNumber,
		customerName: formatCustomerName(order.customer),
		customerAddress: formatDeliveryAddress(order.delivery),
		customerPhoneNumber: order.customer.phone?.trim() ?? '',
		restaurantName: STORE_LOCATION.name,
		restaurantAddress: STORE_LOCATION.address,
		pickupLatitude: STORE_LOCATION.lat,
		pickupLongitude: STORE_LOCATION.lon,
		orderItem: order.items.map((item) => ({
			name: item.name,
			unitPrice: item.price,
			quantity: item.quantity
		})),
		totalOrderCost: order.totalAmount,
		// The customer always pays online through Stripe before dispatch, so the
		// rider must never collect money on delivery.
		paymentMethod: 'credit_card',
		orderSource: 'Bodega La Pascuala Online'
	};

	const email = order.customer.email?.trim();
	if (email) {
		payload.customerEmail = email;
	}

	const instruction = order.notes?.trim();
	if (instruction) {
		payload.deliveryInstruction = instruction;
	}

	if (deliveryCoordinates) {
		payload.deliveryLatitude = deliveryCoordinates.lat;
		payload.deliveryLongitude = deliveryCoordinates.lon;
	}

	return payload;
}

export interface ShipdayCreateOrderResponse {
	success?: boolean;
	response?: string;
	orderId?: number;
}

/**
 * Create the delivery in Shipday. Auth is a raw API key after the `Basic`
 * scheme (Shipday does not use base64 credentials here).
 */
export async function createShipdayOrder(
	payload: ShipdayOrderPayload
): Promise<ShipdayCreateOrderResponse> {
	const { shipdayApiKey } = getShipdayConfig();
	if (!shipdayApiKey) {
		throw new RequestError(503, 'shipday_not_configured', 'Shipday is not configured');
	}

	const response = await fetch(`${SHIPDAY_API_BASE_URL}/orders`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${shipdayApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(10000)
	});

	const rawBody = await response.text();
	if (!response.ok) {
		throw new RequestError(
			502,
			'shipday_error',
			`Shipday rejected the order (${response.status}): ${rawBody.slice(0, 300)}`
		);
	}

	try {
		return JSON.parse(rawBody) as ShipdayCreateOrderResponse;
	} catch {
		return {};
	}
}

// How far along the fulfilment lifecycle each Shipday event places the order.
const EVENT_TO_STATUS: Partial<Record<ShipdayEventType, OrderStatus>> = {
	[SHIPDAY_EVENT.orderOnTheWay]: ORDER_STATUS.shipped,
	[SHIPDAY_EVENT.orderPickedUp]: ORDER_STATUS.shipped,
	[SHIPDAY_EVENT.orderCompleted]: ORDER_STATUS.completed
};

const STATUS_RANK: Record<string, number> = {
	[ORDER_STATUS.pendingPayment]: 0,
	[ORDER_STATUS.paid]: 1,
	[ORDER_STATUS.preparing]: 2,
	[ORDER_STATUS.shipped]: 3,
	[ORDER_STATUS.completed]: 4
};

/**
 * Translate a Shipday event into our order status, only ever moving forward.
 * Unknown events, cancelled orders and failed deliveries leave the order
 * untouched — those need a human decision (refund, retry) rather than an
 * automatic transition.
 */
export function mapShipdayEventToOrderStatus(
	event: string,
	currentStatus: OrderStatus
): OrderStatus | null {
	const nextStatus = EVENT_TO_STATUS[event as ShipdayEventType];
	if (!nextStatus || nextStatus === currentStatus) {
		return null;
	}

	if (currentStatus === ORDER_STATUS.cancelled) {
		return null;
	}

	const currentRank = STATUS_RANK[currentStatus];
	const nextRank = STATUS_RANK[nextStatus];
	if (currentRank === undefined || nextRank === undefined || nextRank <= currentRank) {
		return null;
	}

	return nextStatus;
}
