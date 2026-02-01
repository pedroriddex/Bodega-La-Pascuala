<script lang="ts">
	import { cartTotal, cartCount } from '$lib/stores/cart';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
</script>

{#if $cartCount > 0}
	<div
		class="fixed bottom-0 md:bottom-4 md:right-4 z-50 w-full md:w-auto"
		transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
	>
		<a
			href="/checkout"
			class="group flex items-center justify-center gap-3 bg-[#214593] text-white md:rounded-full rounded-tl-lg rounded-tr-lg pl-6 pr-2 md:pr-4 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ring-2 ring-white/50 no-underline"
		>
			<span class="text-lg font-bold tracking-wide uppercase">Hacer pedido</span>
			<div
				class="bg-white text-[#214593] font-bold px-3 py-1.5 rounded-full min-w-[3rem] text-center shadow-sm group-hover:bg-[#214593] group-hover:text-white transition-colors"
			>
				{$cartTotal.toFixed(2)}€
			</div>
		</a>
	</div>
{/if}
