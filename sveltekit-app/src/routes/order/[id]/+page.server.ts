import { error, isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { serverClient } from '$lib/server/sanity/client';
import { getTrackingConfig } from '$lib/server/config';
import { verifyTrackingToken } from '$lib/server/security/tracking-token';
import type { CanonicalOrderItem, OrderStatus } from '$lib/types/order';

interface TrackingOrder {
	publicId: string;
	orderNumber?: string;
	status: OrderStatus;
	items: CanonicalOrderItem[];
	totalAmount: number;
	createdAt: string;
	updatedAt: string;
	customerName: string;
	deliveryMethod: 'pickup' | 'delivery';
	deliveryCity?: string;
}

const orderQuery = `*[_type == "order" && publicId == $publicId][0]{
  publicId,
  orderNumber,
  status,
  items,
  totalAmount,
  createdAt,
  "updatedAt": _updatedAt,
  "customerName": select(
    defined(customer.firstName) && defined(customer.lastName) => customer.firstName + " " + customer.lastName,
    defined(customer.firstName) => customer.firstName,
    "Cliente"
  ),
  "deliveryMethod": delivery.method,
  "deliveryCity": delivery.city
}`;

function notFound(): never {
	throw error(404, 'Pedido no encontrado');
}

const trackingConfig = getTrackingConfig();

export const load: PageServerLoad = async ({ params, url }) => {
	const trackingToken = url.searchParams.get('t');
	if (!trackingToken) {
		notFound();
	}

	const verification = verifyTrackingToken(trackingToken, trackingConfig.trackingTokenSecret);
	if (!verification.valid || verification.orderPublicId !== params.id) {
		notFound();
	}

	try {
		const order = await serverClient.fetch<TrackingOrder | null>(orderQuery, {
			publicId: params.id
		});

		if (!order) {
			notFound();
		}

		return { order, trackingToken };
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}

		console.error('Error fetching tracked order:', err);
		throw error(500, 'Error cargando el pedido');
	}
};
