import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverClient } from '$lib/server/sanity/client';
import { getTrackingConfig } from '$lib/server/config';
import { verifyTrackingToken } from '$lib/server/security/tracking-token';
import type { OrderStatus } from '$lib/types/order';

interface TrackingOrderStatus {
	status: OrderStatus;
	updatedAt: string;
}

const orderStatusQuery = `*[_type == "order" && publicId == $publicId][0]{
  status,
  "updatedAt": _updatedAt
}`;

const trackingConfig = getTrackingConfig();

function notFound(): never {
	throw error(404, 'Pedido no encontrado');
}

export const GET: RequestHandler = async ({ params, url }) => {
	const trackingToken = url.searchParams.get('t');
	if (!trackingToken) {
		notFound();
	}

	const verification = verifyTrackingToken(trackingToken, trackingConfig.trackingTokenSecret);
	if (!verification.valid || verification.orderPublicId !== params.id) {
		notFound();
	}

	const order = await serverClient.fetch<TrackingOrderStatus | null>(orderStatusQuery, {
		publicId: params.id
	});
	if (!order) {
		notFound();
	}

	return json(order, {
		headers: {
			'cache-control': 'no-store'
		}
	});
};
