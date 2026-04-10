<script lang="ts">
	import { urlFor } from '$lib/sanity/image';
	import type { Drink } from '$lib/types/sanity';
	import CartControl from './CartControl.svelte';

	export let product: Drink;
</script>

<article
	class="group flex flex-col rounded-xl mt-12 md:mt-0 bg-white transition-all duration-300 hover:bg-gray-50/50 border border-gray-300 hover:shadow-sm overflow-hidden"
>
	<!-- Imagen del producto (Derecha) -->
	{#if product.image?.asset}
		<div
			class="relative min-w-[160px] md:w-50 w-full -order-1 md:order-0 md:min-w-[160px] p-0 self-center md:p-2"
		>
			<div
				class="w-full overflow-hidden rounded-lg bg-gray-100 md:relative relative -top-12 md:top-0"
			>
				<img
					src={urlFor(product.image).width(500).url()}
					alt={product.image?.alt || product.title}
					class="object-contain"
				/>
				<!-- Overlay sutil -->
				<div
					class="absolute inset-0 bg-brand-blue/0 transition-colors duration-300 group-hover:bg-brand-blue/5"
				/>
			</div>
		</div>
	{:else}
		<div class="relative w-32 min-w-[120px] md:w-60 md:min-w-[160px] p-2 self-center">
			<div class="aspect-square w-full flex items-center justify-center rounded-lg bg-gray-50">
				<!-- Generic Drink Icon (Glass/Bottle placeholder) -->
				<svg class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19.75 4.5H4.25c-.69 0-1.25.56-1.25 1.25v2.25c0 5.52 4.48 10 10 10s10-4.48 10-10V5.75c0-.69-.56-1.25-1.25-1.25z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 18v4m-4 0h8"
					/>
				</svg>
			</div>
		</div>
	{/if}
	<!-- Contenido (Izquierda) -->
	<div class="flex flex-1 flex-col justify-between p-4 pr-2 -mt-12 md:mt-0 bg-[#214593]">
		<div>
			<h3 class="mb-1 text-lg font-bold text-white uppercase leading-tight tracking-tight">
				{product.title}
			</h3>
		</div>

		<!-- Cart Control -->
		<div class="mt-auto pt-2">
			<div class="flex flex-wrap gap-2 mb-1">
				<CartControl
					id={product._id}
					title={product.title || 'Bebida'}
					price={product.price ?? 0}
					type="drink"
				/>
			</div>
		</div>
	</div>
</article>
