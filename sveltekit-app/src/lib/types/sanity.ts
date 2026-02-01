
import type { ImageAsset } from '@sanity/types';

export interface SanityImage {
    asset?: ImageAsset;
    alt?: string;
    hotspot?: {
        x: number;
        y: number;
        height: number;
        width: number;
    };
    crop?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
        bottom_left?: { x: number; y: number };
        top_right?: { x: number; y: number };
    };
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

export interface OrderItem {
    name: string;
    quantity: number;
    price: number;
    type: 'half' | 'full' | 'drink';
    total: number;
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
    orderNumber?: string;
    customer: OrderCustomer;
    delivery: OrderDelivery;
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'completed' | 'cancelled';
    stripePaymentId?: string;
    createdAt: string;
}
