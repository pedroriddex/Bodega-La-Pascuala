<script lang="ts">
	import { urlFor } from '$lib/sanity/image';
	import type { Drink } from '$lib/types/sanity';
	import CartControl from './CartControl.svelte';

	export let product: Drink;
</script>

<article
	class="group flex flex-col overflow-hidden rounded-2xl border border-brand-blue/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
>
	<!-- Imagen de la bebida -->
	{#if product.image?.asset}
		<div class="flex aspect-square w-full items-center justify-center bg-brand-cream/50 p-4">
			<img
				src={urlFor(product.image).width(400).url()}
				alt={product.image?.alt || product.title}
				class="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
			/>
		</div>
	{:else}
		<div class="flex aspect-square w-full items-center justify-center bg-brand-cream">
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
					d="M19.75 4.5H4.25c-.69 0-1.25.56-1.25 1.25v2.25c0 5.52 4.48 10 10 10s10-4.48 10-10V5.75c0-.69-.56-1.25-1.25-1.25z"
				/>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18v4m-4 0h8" />
			</svg>
		</div>
	{/if}

	<!-- Contenido -->
	<div class="flex flex-1 items-center justify-between gap-3 p-4">
		<h3 class="text-lg font-extrabold uppercase leading-tight tracking-tight text-brand-blue">
			{product.title}
		</h3>

		<CartControl
			id={product._id}
			title={product.title || 'Bebida'}
			price={product.price ?? 0}
			type="drink"
		/>
	</div>
</article>
