export const STORE_LOCATION = {
	name: 'Bodega La Pascuala',
	address: 'Carrer del Dr. Lluch, 299, 46011 València, Valencia',
	lat: 39.4739468,
	lon: -0.3275361
} as const;

export const DELIVERY_MAX_DISTANCE_KM = 20;

const LAT_DELTA = 0.03;
const LON_DELTA = 0.045;

const bbox = [
	(STORE_LOCATION.lon - LON_DELTA).toFixed(6),
	(STORE_LOCATION.lat - LAT_DELTA).toFixed(6),
	(STORE_LOCATION.lon + LON_DELTA).toFixed(6),
	(STORE_LOCATION.lat + LAT_DELTA).toFixed(6)
].join('%2C');

const marker = `${STORE_LOCATION.lat.toFixed(6)}%2C${STORE_LOCATION.lon.toFixed(6)}`;

export const STORE_MAP_EMBED_URL = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

export const STORE_MAP_URL = `https://www.openstreetmap.org/?mlat=${STORE_LOCATION.lat.toFixed(6)}&mlon=${STORE_LOCATION.lon.toFixed(6)}#map=16/${STORE_LOCATION.lat.toFixed(6)}/${STORE_LOCATION.lon.toFixed(6)}`;
