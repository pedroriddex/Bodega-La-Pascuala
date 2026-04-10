import { RequestError } from '$lib/server/http-error';
import type { CanonicalOrderSummary, CheckoutItemInput, OrderItemType } from '$lib/types/order';

export interface CatalogProduct {
	_id: string;
	_type: 'sandwich' | 'drink';
	title?: string;
	price?: number;
	pricing?: {
		halfSize?: number;
		fullSize?: number;
	};
}

const catalogQuery = `*[_type in ["sandwich", "drink"] && _id in $ids]{
  _id,
  _type,
  title,
  price,
  pricing
}`;

function toCents(amount: number): number {
	return Math.round(amount * 100);
}

function toEuros(amountCents: number): number {
	return Number((amountCents / 100).toFixed(2));
}

function getUnitPrice(product: CatalogProduct, itemType: OrderItemType): number {
	if (itemType === 'drink') {
		if (product._type !== 'drink' || typeof product.price !== 'number' || product.price <= 0) {
			throw new RequestError(
				400,
				'invalid_items',
				`Product ${product._id} is not a purchasable drink`
			);
		}

		return product.price;
	}

	if (product._type !== 'sandwich') {
		throw new RequestError(400, 'invalid_items', `Product ${product._id} is not a sandwich`);
	}

	const unitPrice = itemType === 'half' ? product.pricing?.halfSize : product.pricing?.fullSize;
	if (typeof unitPrice !== 'number' || unitPrice <= 0) {
		throw new RequestError(
			400,
			'invalid_items',
			`Product ${product._id} has no valid price for type ${itemType}`
		);
	}

	return unitPrice;
}

export function calculateCanonicalOrder(
	items: CheckoutItemInput[],
	products: CatalogProduct[]
): CanonicalOrderSummary {
	const mergedItems = new Map<string, CheckoutItemInput>();
	for (const item of items) {
		const key = `${item.id}::${item.type}`;
		const current = mergedItems.get(key);
		if (current) {
			current.quantity += item.quantity;
		} else {
			mergedItems.set(key, { ...item });
		}
	}

	const productById = new Map(products.map((product) => [product._id, product]));

	const canonicalItems = Array.from(mergedItems.values()).map((item) => {
		if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 20) {
			throw new RequestError(400, 'invalid_items', `Invalid quantity for product ${item.id}`);
		}

		const product = productById.get(item.id);
		if (!product) {
			throw new RequestError(400, 'invalid_items', `Product ${item.id} does not exist`);
		}

		const unitPrice = getUnitPrice(product, item.type);
		const unitPriceCents = toCents(unitPrice);
		const lineTotalCents = unitPriceCents * item.quantity;

		return {
			productId: item.id,
			name: product.title?.trim() || 'Producto',
			quantity: item.quantity,
			price: toEuros(unitPriceCents),
			type: item.type,
			total: toEuros(lineTotalCents)
		};
	});

	if (canonicalItems.length === 0) {
		throw new RequestError(400, 'invalid_items', 'At least one valid item is required');
	}

	const totalAmountCents = canonicalItems.reduce((sum, item) => sum + toCents(item.total), 0);

	return {
		items: canonicalItems,
		totalAmount: toEuros(totalAmountCents),
		totalAmountCents
	};
}

export async function buildCanonicalOrder(
	items: CheckoutItemInput[]
): Promise<CanonicalOrderSummary> {
	const ids = Array.from(new Set(items.map((item) => item.id)));
	if (ids.length === 0) {
		throw new RequestError(400, 'invalid_items', 'At least one item is required');
	}

	const { serverClient } = await import('$lib/server/sanity/client');
	const products = await serverClient.fetch<CatalogProduct[]>(catalogQuery, { ids });
	return calculateCanonicalOrder(items, products ?? []);
}
