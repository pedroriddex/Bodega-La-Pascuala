<script lang="ts">
	import { formatDate } from '$lib/utils';
	import { urlFor } from '$lib/sanity/image';
	import type { Sandwich } from '$lib/types/sanity';
	import CartControl from './CartControl.svelte';
	import AllergenList from './AllergenList.svelte';

	export let product: Sandwich;
</script>

<article
	class="group flex flex-col md:flex-row rounded-xl mt-12 md:mt-0 bg-white transition-all duration-300 hover:bg-gray-50/50 border border-gray-300 hover:shadow-sm"
>
	<!-- Contenido (Izquierda) -->
	<div class="flex flex-1 flex-col justify-between p-4 pr-2 -mt-12 md:mt-0">
		<div>
			<h3 class="mb-1 text-lg font-bold uppercase text-[#214593] leading-tight tracking-tight">
				{product.title}
			</h3>

			{#if product.description}
				<p class="mb-3 line-clamp-2 text-sm text-gray-500 font-medium leading-relaxed">
					{product.description}
				</p>
			{/if}
		</div>

		<!-- Metadata / Pricing -->
		<div class="mt-auto pt-2">
			{#if product.pricing}
				<div class="flex flex-wrap gap-2 mb-1">
					{#if product.pricing.halfSize}
						<CartControl
							id={product._id}
							title={product.title || 'Bocadillo'}
							price={product.pricing.halfSize ?? 0}
							type="half"
						/>
					{/if}
					{#if product.pricing.fullSize}
						<CartControl
							id={product._id}
							title={product.title || 'Bocadillo'}
							price={product.pricing.fullSize ?? 0}
							type="full"
						/>
					{/if}
				</div>
			{:else}
				<time class="text-xs font-bold uppercase tracking-wider text-brand-yellow">
					{formatDate(product._createdAt)}
				</time>
			{/if}

			{#if product.allergens}
				<AllergenList allergens={product.allergens} />
			{/if}
		</div>
	</div>

	<!-- Imagen del producto (Derecha) -->
	{#if product.image?.asset}
		<div
			class="relative min-w-[128px] md:w-60 w-full -order-1 md:order-0 md:min-w-[160px] p-0 self-center md:p-2"
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
		<div class="relative w-32 min-w-[128px] md:w-60 md:min-w-[160px] p-2 self-center">
			<div class="aspect-square w-full flex items-center justify-center rounded-lg bg-gray-50">
				<svg class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
		</div>
	{/if}
</article>

<style scoped>
	.line-clamp-2 {
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
</style>
