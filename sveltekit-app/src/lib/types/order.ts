import type {
	CanonicalOrderLine,
	CheckoutCustomerFields,
	CheckoutDeliveryFields,
	OrderItemType,
	OrderStatus
} from '@bodega-la-pascuala/contracts';

export type { OrderItemType, OrderStatus };

export interface CheckoutItemInput {
	id: string;
	type: OrderItemType;
	quantity: number;
}

export type CheckoutCustomerInput = CheckoutCustomerFields;

export type CheckoutDeliveryInput = CheckoutDeliveryFields;

export interface CreatePaymentIntentRequest {
	items: CheckoutItemInput[];
	customer: CheckoutCustomerInput;
	delivery: CheckoutDeliveryInput;
	notes?: string;
}

export type CanonicalOrderItem = CanonicalOrderLine;

export interface CanonicalOrderSummary {
	items: CanonicalOrderItem[];
	totalAmount: number;
	totalAmountCents: number;
}
