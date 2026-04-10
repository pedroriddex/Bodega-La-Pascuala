import { writeClient } from '$lib/server/sanity/client';
import { createHash } from 'node:crypto';
import {
	generateOrderNumber,
	getOrderStatusFromPaymentEvent,
	type PaymentIntentEventType
} from './utils';
import type {
	CanonicalOrderItem,
	CheckoutCustomerInput,
	CheckoutDeliveryInput,
	OrderStatus
} from '$lib/types/order';

export interface StoredOrder {
	_id: string;
	status: OrderStatus;
}

export interface CheckoutIntent {
	_id: string;
	orderPublicId: string;
	orderNumber?: string;
	customer: CheckoutCustomerInput;
	delivery: CheckoutDeliveryInput;
	items: CanonicalOrderItem[];
	totalAmount: number;
	notes?: string;
	createdAt: string;
	paymentIntentId?: string;
}

interface SanityOrderItem extends CanonicalOrderItem {
	_key?: string;
	_type?: string;
}

const orderByPaymentIntentQuery = `*[_type == "order" && paymentIntentId == $paymentIntentId][0]{
  _id,
  status
}`;

const orderByPublicIdQuery = `*[_type == "order" && publicId == $publicId][0]{
  _id,
  status
}`;

const checkoutIntentByIdQuery = `*[_type == "checkoutIntent" && _id == $checkoutIntentId][0]{
  _id,
  orderPublicId,
  orderNumber,
  customer,
  delivery,
  items,
  totalAmount,
  notes,
  createdAt,
  paymentIntentId
}`;

const checkoutIntentByPublicIdQuery = `*[_type == "checkoutIntent" && orderPublicId == $publicId][0]{
  _id,
  orderPublicId,
  orderNumber,
  customer,
  delivery,
  items,
  totalAmount,
  notes,
  createdAt,
  paymentIntentId
}`;

const checkoutIntentByPaymentIntentQuery = `*[_type == "checkoutIntent" && paymentIntentId == $paymentIntentId][0]{
  _id,
  orderPublicId,
  orderNumber,
  customer,
  delivery,
  items,
  totalAmount,
  notes,
  createdAt,
  paymentIntentId
}`;

export async function findOrder(
	paymentIntentId: string,
	orderPublicId?: string
): Promise<StoredOrder | null> {
	const byPaymentIntent = await writeClient.fetch<StoredOrder | null>(orderByPaymentIntentQuery, {
		paymentIntentId
	});
	if (byPaymentIntent) {
		return byPaymentIntent;
	}

	if (!orderPublicId) {
		return null;
	}

	return writeClient.fetch<StoredOrder | null>(orderByPublicIdQuery, {
		publicId: orderPublicId
	});
}

export async function findCheckoutIntent(params: {
	checkoutIntentId?: string;
	orderPublicId?: string;
	paymentIntentId?: string;
}): Promise<CheckoutIntent | null> {
	if (params.checkoutIntentId) {
		const byId = await writeClient.fetch<CheckoutIntent | null>(checkoutIntentByIdQuery, {
			checkoutIntentId: params.checkoutIntentId
		});
		if (byId) {
			return byId;
		}
	}

	if (params.paymentIntentId) {
		const byPaymentIntent = await writeClient.fetch<CheckoutIntent | null>(
			checkoutIntentByPaymentIntentQuery,
			{
				paymentIntentId: params.paymentIntentId
			}
		);
		if (byPaymentIntent) {
			return byPaymentIntent;
		}
	}

	if (!params.orderPublicId) {
		return null;
	}

	return writeClient.fetch<CheckoutIntent | null>(checkoutIntentByPublicIdQuery, {
		publicId: params.orderPublicId
	});
}

export async function upsertPaidOrderFromCheckoutIntent(
	checkoutIntent: CheckoutIntent,
	paymentIntentId: string
) {
	const orderId = `order-${checkoutIntent.orderPublicId}`;
	const orderNumber = checkoutIntent.orderNumber || generateOrderNumber();
	const createdAt = checkoutIntent.createdAt || new Date().toISOString();
	const itemsWithKeys = ensureOrderItemKeys(checkoutIntent.orderPublicId, checkoutIntent.items);

	await writeClient.createIfNotExists({
		_id: orderId,
		_type: 'order',
		publicId: checkoutIntent.orderPublicId,
		orderNumber,
		customer: checkoutIntent.customer,
		delivery: checkoutIntent.delivery,
		items: itemsWithKeys,
		totalAmount: checkoutIntent.totalAmount,
		notes: checkoutIntent.notes || '',
		status: 'paid',
		createdAt,
		paymentIntentId,
		stripePaymentId: paymentIntentId
	});

	await writeClient
		.patch(orderId)
		.set({
			items: itemsWithKeys,
			status: 'paid',
			paymentIntentId,
			stripePaymentId: paymentIntentId
		})
		.commit();

	await writeClient.delete(checkoutIntent._id).catch(() => null);
}

export async function applyPaymentEventToOrder(
	order: StoredOrder,
	paymentIntentId: string,
	eventType: PaymentIntentEventType
) {
	const nextStatus = getOrderStatusFromPaymentEvent(order.status, eventType);

	const patchData: Record<string, string> = {
		paymentIntentId,
		stripePaymentId: paymentIntentId
	};

	if (nextStatus !== order.status) {
		patchData.status = nextStatus;
	}

	await writeClient.patch(order._id).set(patchData).commit();
}

function buildItemKey(orderPublicId: string, item: CanonicalOrderItem, index: number): string {
	const seed = `${orderPublicId}:${index}:${item.productId}:${item.type}`;
	return createHash('sha1').update(seed).digest('hex').slice(0, 12);
}

function createUniqueItemKey(
	orderPublicId: string,
	item: CanonicalOrderItem,
	index: number,
	usedKeys: Set<string>
): string {
	let attempt = 0;
	let key = buildItemKey(orderPublicId, item, index);

	while (usedKeys.has(key)) {
		attempt += 1;
		key = createHash('sha1')
			.update(`${orderPublicId}:${index}:${attempt}:${item.productId}:${item.type}`)
			.digest('hex')
			.slice(0, 12);
	}

	return key;
}

function ensureOrderItemKeys(
	orderPublicId: string,
	items: CanonicalOrderItem[]
): Array<SanityOrderItem> {
	const usedKeys = new Set<string>();

	return items.map((item, index) => {
		const candidate = item as SanityOrderItem;
		const keyCandidate = typeof candidate._key === 'string' ? candidate._key.trim() : '';
		const key =
			keyCandidate.length > 0 && !usedKeys.has(keyCandidate)
				? keyCandidate
				: createUniqueItemKey(orderPublicId, item, index, usedKeys);
		usedKeys.add(key);

		const typeCandidate = typeof candidate._type === 'string' ? candidate._type.trim() : '';

		return {
			...item,
			_key: key,
			_type: typeCandidate.length > 0 ? typeCandidate : 'object'
		};
	});
}
