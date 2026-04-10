export type OrderItemType = 'half' | 'full' | 'drink';

export type OrderStatus =
	| 'pending_payment'
	| 'paid'
	| 'preparing'
	| 'shipped'
	| 'completed'
	| 'cancelled';

export interface CheckoutItemInput {
	id: string;
	type: OrderItemType;
	quantity: number;
}

export interface CheckoutCustomerInput {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
}

export interface CheckoutDeliveryInput {
	method: 'pickup' | 'delivery';
	address?: string;
	city?: string;
	zip?: string;
}

export interface CreatePaymentIntentRequest {
	items: CheckoutItemInput[];
	customer: CheckoutCustomerInput;
	delivery: CheckoutDeliveryInput;
	notes?: string;
}

export interface CanonicalOrderItem {
	productId: string;
	name: string;
	quantity: number;
	price: number;
	type: OrderItemType;
	total: number;
}

export interface CanonicalOrderSummary {
	items: CanonicalOrderItem[];
	totalAmount: number;
	totalAmountCents: number;
}
