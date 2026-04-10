<script lang="ts">
	import { onMount } from 'svelte';
	import { cart } from '$lib/stores/cart';
	import { page } from '$app/stores';
	import { fade, scale } from 'svelte/transition';

	onMount(() => {
		cart.clear();
	});

	$: orderPublicId = $page.url.searchParams.get('orderPublicId');
	$: trackingToken = $page.url.searchParams.get('t');
	$: trackingHref =
		orderPublicId && trackingToken
			? `/order/${orderPublicId}?t=${encodeURIComponent(trackingToken)}`
			: null;
</script>

<div class="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
	<div in:scale class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
		<i class="ri-check-line text-5xl text-green-600"></i>
	</div>

	<h1 in:fade={{ delay: 200 }} class="text-3xl font-bold text-[#214593] mb-4">
		¡Pedido Confirmado!
	</h1>

	<p in:fade={{ delay: 400 }} class="text-gray-600 max-w-md mx-auto text-lg mb-8">
		Muchas gracias por tu compra. Hemos recibido tu pedido correctamente y ya estamos preparándolo
		con mucho cariño.
	</p>

	<div in:fade={{ delay: 600 }} class="flex flex-col sm:flex-row gap-4">
		{#if trackingHref}
			<a
				href={trackingHref}
				class="px-8 py-4 bg-[#214593] text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all"
			>
				Sigue tu Pedido
			</a>
		{/if}
		<a
			href="/"
			class="px-8 py-4 bg-[#FABE40] text-[#214593] font-bold rounded-xl shadow-lg hover:brightness-105 transition-all"
		>
			Volver a la Carta
		</a>
	</div>
</div>
