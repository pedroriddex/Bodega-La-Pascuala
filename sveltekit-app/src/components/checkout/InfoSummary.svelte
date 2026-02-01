<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let title: string;
	export let content: { label: string; value: string }[];

	const dispatch = createEventDispatcher();
</script>

<div class="mb-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4 relative group hover:border-brand-blue/30 transition-colors">
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-2">
			<div class="h-2 w-2 rounded-full bg-brand-blue"></div>
			<h3 class="font-bold text-gray-900 text-sm uppercase tracking-wide">{title}</h3>
		</div>
		<button 
			on:click={() => dispatch('edit')}
			class="text-gray-400 hover:text-brand-blue transition-colors p-1 rounded-full hover:bg-white hover:shadow-sm"
			title="Editar"
		>
			<i class="ri-pencil-line text-lg"></i>
		</button>
	</div>
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
		{#each content as item}
			<div class="text-sm">
				<span class="text-gray-500 font-medium">{item.label}:</span>
				<span class="text-gray-900 font-semibold ml-1">{item.value}</span>
			</div>
		{/each}
	</div>
</div>
