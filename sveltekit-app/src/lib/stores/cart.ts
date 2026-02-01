import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface CartItem {
	id: string; // Sanity _id
	type: 'half' | 'full' | 'drink'; // 'media', 'entero', 'bebida'
	title: string;
	price: number;
	quantity: number;
}

function createCart() {
	// Initialize from localStorage if available
	let initialItems: CartItem[] = [];
	if (browser) {
		const stored = localStorage.getItem('pascuala_cart');
		if (stored) {
			try {
				initialItems = JSON.parse(stored);
			} catch (e) {
				console.error('Failed to parse cart:', e);
			}
		}
	}

	const { subscribe, update, set } = writable<CartItem[]>(initialItems);

	return {
		subscribe,
		addItem: (item: Omit<CartItem, 'quantity'>) => {
			update((items) => {
				const existingItemIndex = items.findIndex((i) => i.id === item.id && i.type === item.type);
				let newItems;

				if (existingItemIndex !== -1) {
					// Update quantity if exists
					newItems = [...items];
					newItems[existingItemIndex].quantity += 1;
				} else {
					// Add new item
					newItems = [...items, { ...item, quantity: 1 }];
				}

				if (browser) localStorage.setItem('pascuala_cart', JSON.stringify(newItems));
				return newItems;
			});
		},
		removeItem: (id: string, type: 'half' | 'full' | 'drink') => {
			update((items) => {
				const existingItemIndex = items.findIndex((i) => i.id === id && i.type === type);
				let newItems = items;

				if (existingItemIndex !== -1) {
					newItems = [...items];
					if (newItems[existingItemIndex].quantity > 1) {
						newItems[existingItemIndex].quantity -= 1;
					} else {
						// Remove if quantity is 1
						newItems = items.filter((i) => !(i.id === id && i.type === type));
					}
				}

				if (browser) localStorage.setItem('pascuala_cart', JSON.stringify(newItems));
				return newItems;
			});
		},
		deleteItem: (id: string, type: 'half' | 'full' | 'drink') => {
			update((items) => {
				const newItems = items.filter((i) => !(i.id === id && i.type === type));
				if (browser) localStorage.setItem('pascuala_cart', JSON.stringify(newItems));
				return newItems;
			});
		},
		clear: () => {
			set([]);
			if (browser) localStorage.removeItem('pascuala_cart');
		}
	};
}

export const cart = createCart();

// Totales derivados
export const cartTotal = derived(cart, ($cart) =>
	$cart.reduce((total, item) => total + item.price * item.quantity, 0)
);

export const cartCount = derived(cart, ($cart) =>
	$cart.reduce((total, item) => total + item.quantity, 0)
);
