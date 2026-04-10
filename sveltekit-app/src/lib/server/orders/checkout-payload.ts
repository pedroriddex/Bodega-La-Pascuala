import type {
	CheckoutCustomerInput,
	CheckoutDeliveryInput,
	CheckoutItemInput,
	CreatePaymentIntentRequest,
	OrderItemType
} from '$lib/types/order';
import { RequestError } from '$lib/server/http-error';

const ITEM_ALLOWED_KEYS = new Set(['id', 'type', 'quantity']);
const CUSTOMER_ALLOWED_KEYS = new Set(['firstName', 'lastName', 'email', 'phone']);
const DELIVERY_ALLOWED_KEYS = new Set(['method', 'address', 'city', 'zip']);
const ROOT_ALLOWED_KEYS = new Set(['items', 'customer', 'delivery', 'notes']);

const ITEM_TYPES: OrderItemType[] = ['half', 'full', 'drink'];

function assertObject(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new RequestError(400, 'invalid_payload', `${path} must be an object`);
	}

	return value as Record<string, unknown>;
}

function assertAllowedKeys(obj: Record<string, unknown>, allowed: Set<string>, path: string) {
	for (const key of Object.keys(obj)) {
		if (!allowed.has(key)) {
			throw new RequestError(400, 'invalid_payload', `Unexpected field in ${path}: ${key}`);
		}
	}
}

function readString(value: unknown, path: string, required = true): string {
	if (typeof value !== 'string') {
		if (required) {
			throw new RequestError(400, 'invalid_payload', `${path} must be a string`);
		}
		if (value !== undefined && value !== null) {
			throw new RequestError(400, 'invalid_payload', `${path} must be a string`);
		}
		return '';
	}

	const trimmed = value.trim();
	if (required && trimmed.length === 0) {
		throw new RequestError(400, 'invalid_payload', `${path} cannot be empty`);
	}

	return trimmed;
}

function parseItems(value: unknown): CheckoutItemInput[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new RequestError(400, 'invalid_items', 'items must be a non-empty array');
	}

	return value.map((rawItem, index) => {
		const item = assertObject(rawItem, `items[${index}]`);
		assertAllowedKeys(item, ITEM_ALLOWED_KEYS, `items[${index}]`);

		const id = readString(item.id, `items[${index}].id`);
		const type = readString(item.type, `items[${index}].type`) as OrderItemType;
		const quantity = item.quantity;

		if (!ITEM_TYPES.includes(type)) {
			throw new RequestError(400, 'invalid_items', `Invalid item type at items[${index}]`);
		}

		if (!Number.isInteger(quantity) || Number(quantity) <= 0 || Number(quantity) > 20) {
			throw new RequestError(
				400,
				'invalid_items',
				`Quantity at items[${index}] must be an integer between 1 and 20`
			);
		}

		return {
			id,
			type,
			quantity: Number(quantity)
		};
	});
}

function parseCustomer(value: unknown): CheckoutCustomerInput {
	const customer = assertObject(value, 'customer');
	assertAllowedKeys(customer, CUSTOMER_ALLOWED_KEYS, 'customer');

	const firstName = readString(customer.firstName, 'customer.firstName');
	const lastName = readString(customer.lastName, 'customer.lastName');
	const email = readString(customer.email, 'customer.email').toLowerCase();
	const phone = readString(customer.phone, 'customer.phone');

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new RequestError(400, 'invalid_customer', 'customer.email must be a valid email address');
	}

	return { firstName, lastName, email, phone };
}

function parseDelivery(value: unknown): CheckoutDeliveryInput {
	const delivery = assertObject(value, 'delivery');
	assertAllowedKeys(delivery, DELIVERY_ALLOWED_KEYS, 'delivery');

	const method = readString(delivery.method, 'delivery.method') as CheckoutDeliveryInput['method'];
	if (method !== 'pickup' && method !== 'delivery') {
		throw new RequestError(400, 'invalid_delivery', 'delivery.method must be pickup or delivery');
	}

	if (method === 'pickup') {
		return { method: 'pickup' };
	}

	const address = readString(delivery.address, 'delivery.address');
	const city = readString(delivery.city, 'delivery.city');
	const zip = readString(delivery.zip, 'delivery.zip');

	return { method: 'delivery', address, city, zip };
}

export function parseCheckoutPayload(input: unknown): CreatePaymentIntentRequest {
	const root = assertObject(input, 'payload');
	assertAllowedKeys(root, ROOT_ALLOWED_KEYS, 'payload');

	const items = parseItems(root.items);
	const customer = parseCustomer(root.customer);
	const delivery = parseDelivery(root.delivery);
	const notes = root.notes === undefined ? '' : readString(root.notes, 'notes', false);

	if (notes.length > 500) {
		throw new RequestError(400, 'invalid_payload', 'notes must be 500 characters or fewer');
	}

	return {
		items,
		customer,
		delivery,
		notes
	};
}
