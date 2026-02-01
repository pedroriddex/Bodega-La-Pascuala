<script lang="ts">
	import { cartTotal, cartCount } from '$lib/stores/cart';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
</script>

{#if $cartCount > 0}
	<div
		class="fixed bottom-6 right-6 z-50"
		transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
	>
		<a
			href="/checkout"
			class="group flex items-center gap-3 bg-[#214593] text-white rounded-full pl-6 pr-2 py-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ring-2 ring-white/50 no-underline"
		>
			<span class="text-lg font-bold tracking-wide uppercase">Pedir</span>
			<div
				class="bg-white text-brand-blue font-bold px-3 py-1.5 rounded-full min-w-[3rem] text-center shadow-sm group-hover:bg-brand-yellow group-hover:text-brand-blue transition-colors"
			>
				{$cartTotal.toFixed(2)}€
			</div>
		</a>
	</div>
{/if}
