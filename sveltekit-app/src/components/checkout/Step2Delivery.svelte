<script lang="ts">
	import {
		DELIVERY_MAX_DISTANCE_KM,
		STORE_LOCATION,
		STORE_MAP_EMBED_URL,
		STORE_MAP_URL
	} from '$lib/config/delivery';

	export let data: {
		method: 'pickup' | 'delivery';
		address: string;
		city: string;
		zip: string;
		saveAddress: boolean;
	};

	export let checkingDistance = false;
	export let distanceKm: number | null = null;
</script>

<div class="space-y-8 animate-fade-in">
	<div class="grid md:grid-cols-2 gap-4">
		<label
			class="cursor-pointer relative overflow-hidden rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all duration-200 shadow-sm group
            {data.method === 'pickup'
				? 'border-[#214593] bg-blue-50/50 text-[#214593] ring-1 ring-brand-blue/20'
				: 'border-gray-100 bg-white text-gray-500 hover:border-brand-blue/30 hover:shadow-md'}"
		>
			<input type="radio" bind:group={data.method} value="pickup" class="hidden" />
			<div
				class="p-3 rounded-full {data.method === 'pickup'
					? 'bg-white'
					: 'bg-gray-50 group-hover:bg-blue-50'} transition-colors"
			>
				<i class="ri-store-2-line text-2xl"></i>
			</div>
			<span class="font-bold text-sm uppercase tracking-wide">Recogida en Local</span>
		</label>

		<label
			class="cursor-pointer relative overflow-hidden rounded-2xl border-2 p-6 flex flex-col items-center gap-3 transition-all duration-200 shadow-sm group
            {data.method === 'delivery'
				? 'border-[#214593] bg-blue-50/50 text-[#214593] ring-1 ring-brand-blue/20'
				: 'border-gray-100 bg-white text-gray-500 hover:border-brand-blue/30 hover:shadow-md'}"
		>
			<input type="radio" bind:group={data.method} value="delivery" class="hidden" />
			<div
				class="p-3 rounded-full {data.method === 'delivery'
					? 'bg-white'
					: 'bg-gray-50 group-hover:bg-blue-50'} transition-colors"
			>
				<i class="ri-truck-line text-2xl"></i>
			</div>
			<span class="font-bold text-sm uppercase tracking-wide">Envío a Domicilio</span>
		</label>
	</div>

	<div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex items-start gap-3">
			<div class="mt-1 rounded-lg bg-blue-50 p-2 text-[#214593]">
				<i class="ri-map-pin-2-line text-xl"></i>
			</div>
			<div class="min-w-0">
				<p class="text-xs font-bold uppercase tracking-wide text-[#214593]">Ubicación del local</p>
				<p class="text-sm font-semibold text-gray-800">{STORE_LOCATION.name}</p>
				<p class="text-sm text-gray-600">{STORE_LOCATION.address}</p>
				<p class="mt-2 text-xs text-gray-500">
					El envío a domicilio se realiza solo en un radio de {DELIVERY_MAX_DISTANCE_KM} km.
				</p>
			</div>
		</div>

		<div class="mt-4 overflow-hidden rounded-xl border border-gray-200">
			<iframe
				title="Mapa de Bodega La Pascuala"
				src={STORE_MAP_EMBED_URL}
				class="h-64 w-full"
				loading="lazy"
				referrerpolicy="no-referrer-when-downgrade"
			></iframe>
		</div>

		<div class="mt-3 flex items-center justify-between gap-3">
			<a
				href={STORE_MAP_URL}
				target="_blank"
				rel="noreferrer"
				class="text-sm font-semibold text-[#214593] hover:underline"
			>
				Abrir mapa en OpenStreetMap
			</a>
			{#if data.method === 'delivery'}
				{#if checkingDistance}
					<span class="text-xs font-medium text-gray-500">Comprobando cobertura...</span>
				{:else if distanceKm !== null}
					<span class="text-xs font-medium text-emerald-700">
						Distancia estimada: {distanceKm.toFixed(2)} km
					</span>
				{/if}
			{/if}
		</div>
	</div>

	{#if data.method === 'delivery'}
		<div class="space-y-6 pt-6 border-t border-gray-100">
			<div class="space-y-2">
				<label for="address" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
					>Dirección</label
				>
				<input
					type="text"
					id="address"
					bind:value={data.address}
					class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
					placeholder="Ej: Calle Gran Vía, 24, 3ºA"
				/>
			</div>

			<div class="grid grid-cols-2 gap-6">
				<div class="space-y-2">
					<label for="city" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
						>Ciudad</label
					>
					<input
						type="text"
						id="city"
						bind:value={data.city}
						class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
						placeholder="Valencia"
					/>
				</div>
				<div class="space-y-2">
					<label for="zip" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
						>Código Postal</label
					>
					<input
						type="text"
						id="zip"
						bind:value={data.zip}
						class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
						placeholder="46000"
					/>
				</div>
			</div>

			<div class="flex items-center gap-3 pt-4">
				<input
					type="checkbox"
					id="saveAddress"
					bind:checked={data.saveAddress}
					class="h-5 w-5 rounded border-gray-300 text-brand-blue focus:border-brand-blue focus:ring-brand-blue"
				/>
				<label
					for="saveAddress"
					class="text-sm font-medium text-gray-600 cursor-pointer select-none"
				>
					Guardar esta dirección para futuros pedidos
				</label>
			</div>
		</div>
	{/if}
</div>
