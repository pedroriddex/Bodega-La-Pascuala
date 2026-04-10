import type { CanonicalOrderItem, OrderStatus } from '$lib/types/order';

export interface SanityImage {
	asset?: {
		_ref?: string;
		_type?: string;
		url?: string;
	};
	alt?: string;
	[key: string]: unknown;
}

export interface Sandwich {
	_type: 'sandwich';
	_id: string;
	_createdAt: string;
	title?: string;
	description?: string;
	image?: SanityImage;
	pricing?: {
		halfSize?: number;
		fullSize?: number;
	};
	allergens?: string[];
}

export interface Drink {
	_type: 'drink';
	_id: string;
	_createdAt: string;
	title?: string;
	price?: number;
	image?: SanityImage;
}

export interface OrderCustomer {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
}

export interface OrderDelivery {
	method: 'pickup' | 'delivery';
	address?: string;
	city?: string;
	zip?: string;
}

export interface Order {
	_type: 'order';
	_id?: string;
	publicId: string;
	orderNumber?: string;
	customer: OrderCustomer;
	delivery: OrderDelivery;
	items: CanonicalOrderItem[];
	totalAmount: number;
	status: OrderStatus;
	paymentIntentId?: string;
	stripePaymentId?: string;
	notes?: string;
	createdAt: string;
}

export interface StoreSettings {
	isOpen?: boolean;
	closedMessage?: string;
}
