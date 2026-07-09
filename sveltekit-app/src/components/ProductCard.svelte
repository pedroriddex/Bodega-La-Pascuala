<script lang="ts">
	import { urlFor } from '$lib/sanity/image';
	import type { Sandwich } from '$lib/types/sanity';
	import CartControl from './CartControl.svelte';
	import AllergenList from './AllergenList.svelte';

	export let product: Sandwich;
</script>

<article
	class="group flex flex-col overflow-hidden rounded-2xl border border-brand-blue/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
>
	<!-- Imagen del producto -->
	{#if product.image?.asset}
		<div class="aspect-[5/4] w-full overflow-hidden bg-white">
			<img
				src={urlFor(product.image).width(600).url()}
				alt={product.image?.alt || product.title}
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
			/>
		</div>
	{:else}
		<div class="flex aspect-[5/4] w-full items-center justify-center bg-brand-cream">
			<svg
				class="h-10 w-10 text-brand-blue/20"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		</div>
	{/if}

	<!-- Contenido -->
	<div class="flex flex-1 flex-col p-4">
		<h3 class="mb-1 text-xl font-extrabold uppercase leading-tight tracking-tight text-brand-blue">
			{product.title}
		</h3>

		{#if product.description}
			<p class="mb-3 line-clamp-2 text-sm font-medium leading-relaxed text-gray-600">
				{product.description}
			</p>
		{/if}

		<div class="mt-auto pt-2">
			{#if product.pricing}
				<div class="mb-1 flex flex-wrap gap-3">
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
			{/if}

			{#if product.allergens}
				<AllergenList allergens={product.allergens} />
			{/if}
		</div>
	</div>
</article>

<style scoped>
	.line-clamp-2 {
		overflow: hidden;
		line-clamp: 2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
</style>
