<script lang="ts">
	export let allergens: string[] = [];

	const allergenMap: Record<string, string> = {
		gluten: 'GLUTEN',
		cacahuetes: 'CACAHUETES',
		'frutos-secos': 'FRUTOS SECOS',
		leche: 'LACTEOS',
		huevo: 'HUEVOS',
		pescado: 'PESCADO',
		marisco: 'MARISCO',
		soja: 'SOJA',
		mostaza: 'MOSTAZA',
		sesamo: 'SESAMO'
	};

	$: displayList = allergens?.map((a) => allergenMap[a] || a).join(' · ');
</script>

{#if displayList}
	<div class="text-[10px] uppercase text-gray-400 font-medium tracking-wide mt-2">
		{displayList}
	</div>
{/if}
