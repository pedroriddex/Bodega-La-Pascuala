<script lang="ts">
	import { cart } from '$lib/stores/cart';
	import { scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	export let id: string;
	export let title: string;
	export let price: number;
	export let type: 'half' | 'full' | 'drink';

	$: quantity = $cart.find((i) => i.id === id && i.type === type)?.quantity || 0;

	function addToCart() {
		cart.addItem({
			id,
			type,
			title,
			price
		});
	}

	function removeFromCart() {
		cart.removeItem(id, type);
	}
</script>

<div class="flex flex-col items-start gap-1">
	{#if type !== 'drink'}
		<span class="text-[10px] font-bold uppercase tracking-wider text-[#214593] ml-1">
			{type === 'half' ? 'Medio' : 'Entero'}
		</span>
	{/if}

	<div
		class="flex items-center gap-2 rounded-full px-2 py-2 transition-all duration-300 shadow-sm {type ===
		'half'
			? 'bg-brand-yellow/20 text-[#214593] border border-[#214593]'
			: type === 'drink'
				? 'bg-[#214593] text-white border'
				: 'bg-[#214593] text-white border'}"
	>
		{#if quantity > 0}
			<div transition:scale={{ duration: 200, easing: cubicOut, start: 0.5 }} class="flex">
				<button
					class="flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110 {type ===
					'half'
						? 'bg-white text-[#214593] hover:bg-white/80'
						: type === 'drink'
							? 'bg-white text-[#214593] hover:bg-white/90'
							: 'bg-white text-[#214593] hover:bg-gray-200'}"
					on:click|preventDefault={removeFromCart}
					aria-label="Quitar uno"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="w-3.5 h-3.5"
					>
						<path d="M6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
					</svg>
				</button>
			</div>
		{/if}

		<span class="text-sm font-bold min-w-[3ch] text-center flex items-center justify-center">
			{#if quantity > 0}
				<span
					transition:scale={{ duration: 200, easing: cubicOut, start: 0.5, axis: 'x' }}
					class="mr-1"
				>
					{quantity} x
				</span>
			{/if}
			{price}€
		</span>

		<button
			class="flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110 {type ===
			'half'
				? 'bg-brand-yellow text-brand-blue hover:bg-brand-yellow/80'
				: type === 'drink'
					? 'bg-white text-black hover:bg-gray-200'
					: 'bg-white text-black hover:bg-gray-200'}"
			on:click|preventDefault={addToCart}
			aria-label="Añadir otro"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="w-3.5 h-3.5"
			>
				<path
					d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
				/>
			</svg>
		</button>
	</div>
</div>
