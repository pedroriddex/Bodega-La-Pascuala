import { describe, expect, it } from 'vitest';
import {
	buildDeliveryLookupQuery,
	haversineDistanceKm,
	validateDeliveryCoverage,
	type AddressGeocoder
} from './radius';

describe('delivery radius', () => {
	it('builds a delivery lookup query', () => {
		const query = buildDeliveryLookupQuery({
			address: 'Carrer del Doctor Lluch 299',
			city: 'València',
			zip: '46011'
		});

		expect(query).toBe('Carrer del Doctor Lluch 299, 46011 València, Valencia, España');
	});

	it('calculates haversine distance', () => {
		const distance = haversineDistanceKm(
			{ lat: 39.4739468, lon: -0.3275361 },
			{ lat: 39.4739468, lon: -0.3275361 }
		);
		expect(distance).toBeLessThan(0.001);
	});

	it('allows delivery addresses inside the radius', async () => {
		const geocoder: AddressGeocoder = async () => ({
			lat: 39.45,
			lon: -0.35
		});

		const result = await validateDeliveryCoverage(
			{
				method: 'delivery',
				address: 'Calle de prueba 1',
				city: 'Valencia',
				zip: '46001'
			},
			geocoder
		);

		expect(result).not.toBeNull();
		expect(result?.distanceKm).toBeLessThanOrEqual(20);
	});

	it('rejects delivery addresses outside the radius', async () => {
		const geocoder: AddressGeocoder = async () => ({
			lat: 39.9,
			lon: -0.7
		});

		await expect(
			validateDeliveryCoverage(
				{
					method: 'delivery',
					address: 'Calle lejana 9',
					city: 'Valencia',
					zip: '46001'
				},
				geocoder
			)
		).rejects.toMatchObject({
			status: 400,
			code: 'delivery_out_of_range'
		});
	});

	it('returns null for pickup orders', async () => {
		const geocoder: AddressGeocoder = async () => ({
			lat: 39.9,
			lon: -0.7
		});

		const result = await validateDeliveryCoverage({ method: 'pickup' }, geocoder);
		expect(result).toBeNull();
	});
});
