import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DELIVERY_MAX_DISTANCE_KM, STORE_LOCATION } from '$lib/config/delivery';
import { RequestError } from '$lib/server/http-error';
import { validateDeliveryCoverage } from '$lib/server/delivery/radius';

function assertObject(value: unknown): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new RequestError(400, 'invalid_payload', 'payload must be an object');
	}
	return value as Record<string, unknown>;
}

function readString(value: unknown, fieldName: string): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new RequestError(400, 'invalid_payload', `${fieldName} is required`);
	}
	return value.trim();
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = assertObject(await request.json());
		const address = readString(payload.address, 'address');
		const city = readString(payload.city, 'city');
		const zip = readString(payload.zip, 'zip');

		const coverage = await validateDeliveryCoverage({
			method: 'delivery',
			address,
			city,
			zip
		});

		if (!coverage) {
			throw new RequestError(400, 'invalid_delivery', 'Coverage check requires delivery method');
		}

		return json({
			valid: true,
			distanceKm: Number(coverage.distanceKm.toFixed(2)),
			maxDistanceKm: DELIVERY_MAX_DISTANCE_KM,
			storeAddress: STORE_LOCATION.address,
			storeCoordinates: {
				lat: STORE_LOCATION.lat,
				lon: STORE_LOCATION.lon
			}
		});
	} catch (error) {
		if (error instanceof RequestError) {
			return json(
				{
					valid: false,
					error: error.message,
					code: error.code,
					maxDistanceKm: DELIVERY_MAX_DISTANCE_KM
				},
				{ status: error.status }
			);
		}

		console.error('Error validating delivery coverage:', error);
		return json(
			{
				valid: false,
				error: 'No se pudo validar la cobertura de envío.',
				code: 'delivery_validation_failed',
				maxDistanceKm: DELIVERY_MAX_DISTANCE_KM
			},
			{ status: 500 }
		);
	}
};
