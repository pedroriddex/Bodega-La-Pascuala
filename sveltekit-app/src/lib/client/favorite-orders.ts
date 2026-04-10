import { browser } from '$app/environment';
import type { CartItem } from '$lib/stores/cart';

const FAVORITES_STORAGE_KEY = 'pascuala_favorite_orders_v1';
const MAX_STORED_ITEMS = 120;

interface StoredFavoriteItem {
	id: string;
	type: CartItem['type'];
	title: string;
	count: number;
	lastOrderedAt: number;
}

interface FavoriteStorePayload {
	version: 1;
	items: StoredFavoriteItem[];
}

export interface FavoriteProduct {
	id: string;
	title: string;
	count: number;
	lastOrderedAt: number;
}

function readFavoriteStore(): FavoriteStorePayload {
	if (!browser) {
		return { version: 1, items: [] };
	}

	const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
	if (!raw) {
		return { version: 1, items: [] };
	}

	try {
		const parsed = JSON.parse(raw) as Partial<FavoriteStorePayload>;
		if (!parsed || !Array.isArray(parsed.items)) {
			return { version: 1, items: [] };
		}

		const items = parsed.items.filter((item): item is StoredFavoriteItem => {
			return (
				typeof item?.id === 'string' &&
				item.id.trim().length > 0 &&
				typeof item?.type === 'string' &&
				typeof item?.title === 'string' &&
				typeof item?.count === 'number' &&
				Number.isFinite(item.count) &&
				item.count > 0 &&
				typeof item?.lastOrderedAt === 'number' &&
				Number.isFinite(item.lastOrderedAt)
			);
		});

		return {
			version: 1,
			items
		};
	} catch (error) {
		console.error('Failed to parse favorite orders from localStorage', error);
		return { version: 1, items: [] };
	}
}

function writeFavoriteStore(payload: FavoriteStorePayload): void {
	if (!browser) {
		return;
	}

	localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(payload));
}

export function trackCompletedOrder(items: CartItem[]): void {
	if (!browser || !Array.isArray(items) || items.length === 0) {
		return;
	}

	const payload = readFavoriteStore();
	const itemMap = new Map<string, StoredFavoriteItem>();

	for (const item of payload.items) {
		itemMap.set(`${item.id}:${item.type}`, item);
	}

	const now = Date.now();
	for (const item of items) {
		if (!item || typeof item.id !== 'string' || item.id.trim().length === 0) {
			continue;
		}

		const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
		const key = `${item.id}:${item.type}`;
		const existing = itemMap.get(key);

		if (existing) {
			existing.count += quantity;
			existing.lastOrderedAt = now;
			existing.title = item.title || existing.title;
			continue;
		}

		itemMap.set(key, {
			id: item.id,
			type: item.type,
			title: item.title || 'Producto',
			count: quantity,
			lastOrderedAt: now
		});
	}

	const mergedItems = [...itemMap.values()]
		.sort((a, b) => b.lastOrderedAt - a.lastOrderedAt)
		.slice(0, MAX_STORED_ITEMS);

	writeFavoriteStore({
		version: 1,
		items: mergedItems
	});
}

export function getFavoriteProducts(limit = 6): FavoriteProduct[] {
	const payload = readFavoriteStore();
	const aggregate = new Map<string, FavoriteProduct>();

	for (const item of payload.items) {
		const existing = aggregate.get(item.id);
		if (!existing) {
			aggregate.set(item.id, {
				id: item.id,
				title: item.title,
				count: item.count,
				lastOrderedAt: item.lastOrderedAt
			});
			continue;
		}

		existing.count += item.count;
		if (item.lastOrderedAt > existing.lastOrderedAt) {
			existing.lastOrderedAt = item.lastOrderedAt;
			existing.title = item.title || existing.title;
		}
	}

	return [...aggregate.values()]
		.sort((a, b) => {
			if (b.count !== a.count) {
				return b.count - a.count;
			}

			return b.lastOrderedAt - a.lastOrderedAt;
		})
		.slice(0, limit);
}
