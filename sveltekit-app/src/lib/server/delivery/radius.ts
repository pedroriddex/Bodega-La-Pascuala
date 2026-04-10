import { DELIVERY_MAX_DISTANCE_KM, STORE_LOCATION } from '$lib/config/delivery';
import { RequestError } from '$lib/server/http-error';
import type { CheckoutDeliveryInput } from '$lib/types/order';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const BOUNDED_SEARCH_KM = DELIVERY_MAX_DISTANCE_KM + 12;

export interface GeoPoint {
	lat: number;
	lon: number;
}

export interface DeliveryCoverageResult {
	distanceKm: number;
	maxDistanceKm: number;
	origin: GeoPoint;
	destination: GeoPoint;
}

export interface DeliveryAddressLookup {
	address: string;
	city: string;
	zip: string;
}

export type AddressGeocoder = (delivery: DeliveryAddressLookup) => Promise<GeoPoint | null>;

function toRadians(value: number): number {
	return (value * Math.PI) / 180;
}

export function haversineDistanceKm(origin: GeoPoint, destination: GeoPoint): number {
	const earthRadiusKm = 6371;
	const deltaLat = toRadians(destination.lat - origin.lat);
	const deltaLon = toRadians(destination.lon - origin.lon);
	const lat1 = toRadians(origin.lat);
	const lat2 = toRadians(destination.lat);

	const a =
		Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return earthRadiusKm * c;
}

export function buildDeliveryLookupQuery(delivery: DeliveryAddressLookup): string {
	return `${delivery.address}, ${delivery.zip} ${delivery.city}, Valencia, España`;
}

function parseGeoPoint(raw: unknown): GeoPoint | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const maybePoint = raw as { lat?: unknown; lon?: unknown };
	const lat = Number(maybePoint.lat);
	const lon = Number(maybePoint.lon);

	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return null;
	}

	return { lat, lon };
}

const geocodeCache = new Map<string, GeoPoint>();

function buildViewboxForStore(radiusKm: number): string {
	const latDelta = radiusKm / 111;
	const lonDelta = radiusKm / (111 * Math.cos(toRadians(STORE_LOCATION.lat)));
	const left = STORE_LOCATION.lon - lonDelta;
	const top = STORE_LOCATION.lat + latDelta;
	const right = STORE_LOCATION.lon + lonDelta;
	const bottom = STORE_LOCATION.lat - latDelta;
	return `${left.toFixed(6)},${top.toFixed(6)},${right.toFixed(6)},${bottom.toFixed(6)}`;
}

function buildCandidateQueries(delivery: DeliveryAddressLookup): string[] {
	const address = delivery.address.trim().replace(/\s+/gu, ' ');
	const city = delivery.city.trim().replace(/\s+/gu, ' ');
	const zip = delivery.zip.trim().replace(/\s+/gu, ' ');

	const primary = buildDeliveryLookupQuery({ address, city, zip });
	const addressMainPart = address.split(',')[0]?.trim() || address;
	const addressWithoutUnit = address
		.replace(/\b(piso|pta|puerta|escalera|bloque|portal)\b.*$/iu, '')
		.replace(/\s+/gu, ' ')
		.trim();

	const queries = [primary];

	if (addressMainPart && addressMainPart !== address) {
		queries.push(buildDeliveryLookupQuery({ address: addressMainPart, city, zip }));
	}
	if (
		addressWithoutUnit &&
		addressWithoutUnit !== address &&
		addressWithoutUnit !== addressMainPart
	) {
		queries.push(buildDeliveryLookupQuery({ address: addressWithoutUnit, city, zip }));
	}

	queries.push(`${address}, ${city}, España`);
	queries.push(`${addressMainPart}, ${city}, España`);

	return [...new Set(queries.filter((query) => query.trim().length > 0))];
}

async function requestNominatim(
	params: URLSearchParams,
	cacheKey?: string
): Promise<GeoPoint | null> {
	if (cacheKey) {
		const cached = geocodeCache.get(cacheKey);
		if (cached) {
			return cached;
		}
	}

	const timeout = AbortSignal.timeout(5000);

	let response: Response;
	try {
		params.set('format', 'jsonv2');
		params.set('limit', '1');
		params.set('countrycodes', 'es');
		const url = `${NOMINATIM_URL}?${params.toString()}`;
		response = await fetch(url, {
			signal: timeout,
			headers: {
				'Accept-Language': 'es',
				'User-Agent': 'bodega-la-pascuala/1.0'
			}
		});
	} catch (error) {
		throw new RequestError(
			503,
			'delivery_validation_unavailable',
			'No se pudo validar la dirección de entrega. Inténtalo de nuevo en unos minutos.'
		);
	}

	if (!response.ok) {
		throw new RequestError(
			503,
			'delivery_validation_unavailable',
			'No se pudo validar la dirección de entrega. Inténtalo de nuevo en unos minutos.'
		);
	}

	const data = (await response.json()) as unknown;
	if (!Array.isArray(data) || data.length === 0) {
		return null;
	}

	const point = parseGeoPoint(data[0]);
	if (!point) {
		return null;
	}

	if (cacheKey) {
		geocodeCache.set(cacheKey, point);
	}
	return point;
}

export async function geocodeDeliveryAddress(
	delivery: DeliveryAddressLookup
): Promise<GeoPoint | null> {
	const queries = buildCandidateQueries(delivery);
	const viewbox = buildViewboxForStore(BOUNDED_SEARCH_KM);
	const structuredBase = {
		street: delivery.address,
		city: delivery.city,
		postalcode: delivery.zip,
		state: 'Valencia',
		country: 'España'
	};

	for (const query of queries) {
		const boundedParams = new URLSearchParams({
			q: query,
			viewbox,
			bounded: '1'
		});
		const boundedResult = await requestNominatim(boundedParams, `bounded:${query}`);
		if (boundedResult) {
			return boundedResult;
		}
	}

	for (const query of queries) {
		const unboundedParams = new URLSearchParams({ q: query });
		const unboundedResult = await requestNominatim(unboundedParams, `unbounded:${query}`);
		if (unboundedResult) {
			return unboundedResult;
		}
	}

	const structuredBoundedParams = new URLSearchParams({
		...structuredBase,
		viewbox,
		bounded: '1'
	});
	const structuredBoundedResult = await requestNominatim(
		structuredBoundedParams,
		`structured-bounded:${delivery.address}|${delivery.city}|${delivery.zip}`
	);
	if (structuredBoundedResult) {
		return structuredBoundedResult;
	}

	const structuredParams = new URLSearchParams(structuredBase);

	return requestNominatim(
		structuredParams,
		`structured:${delivery.address}|${delivery.city}|${delivery.zip}`
	);
}

function ensureDeliveryFields(delivery: CheckoutDeliveryInput): {
	address: string;
	city: string;
	zip: string;
} {
	const address = delivery.address?.trim();
	const city = delivery.city?.trim();
	const zip = delivery.zip?.trim();

	if (!address || !city || !zip) {
		throw new RequestError(400, 'invalid_delivery', 'La dirección de entrega está incompleta.');
	}

	return { address, city, zip };
}

export async function validateDeliveryCoverage(
	delivery: CheckoutDeliveryInput,
	geocoder: AddressGeocoder = geocodeDeliveryAddress
): Promise<DeliveryCoverageResult | null> {
	if (delivery.method === 'pickup') {
		return null;
	}

	const deliveryAddress = ensureDeliveryFields(delivery);
	const destination = await geocoder(deliveryAddress);

	if (!destination) {
		throw new RequestError(
			400,
			'invalid_delivery',
			'No encontramos la dirección. Revisa los datos para calcular el radio de entrega.'
		);
	}

	const origin: GeoPoint = {
		lat: STORE_LOCATION.lat,
		lon: STORE_LOCATION.lon
	};
	const distanceKm = haversineDistanceKm(origin, destination);

	if (distanceKm > DELIVERY_MAX_DISTANCE_KM) {
		throw new RequestError(
			400,
			'delivery_out_of_range',
			`Solo realizamos entregas a un máximo de ${DELIVERY_MAX_DISTANCE_KM} km desde ${STORE_LOCATION.address}.`
		);
	}

	return {
		distanceKm,
		maxDistanceKm: DELIVERY_MAX_DISTANCE_KM,
		origin,
		destination
	};
}
