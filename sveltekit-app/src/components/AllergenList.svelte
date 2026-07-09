<script lang="ts">
	export let allergens: string[] = [];

	// Accepts both Spanish and English allergen keys (the dataset mixes both).
	const allergenMap: Record<string, string> = {
		gluten: 'GLUTEN',
		wheat: 'GLUTEN',
		cacahuetes: 'CACAHUETES',
		peanuts: 'CACAHUETES',
		'frutos-secos': 'FRUTOS SECOS',
		nuts: 'FRUTOS SECOS',
		'tree-nuts': 'FRUTOS SECOS',
		leche: 'LÁCTEOS',
		lacteos: 'LÁCTEOS',
		dairy: 'LÁCTEOS',
		milk: 'LÁCTEOS',
		huevo: 'HUEVOS',
		huevos: 'HUEVOS',
		egg: 'HUEVOS',
		eggs: 'HUEVOS',
		pescado: 'PESCADO',
		fish: 'PESCADO',
		marisco: 'MARISCO',
		shellfish: 'MARISCO',
		soja: 'SOJA',
		soy: 'SOJA',
		mostaza: 'MOSTAZA',
		mustard: 'MOSTAZA',
		sesamo: 'SÉSAMO',
		sesame: 'SÉSAMO'
	};

	$: displayList = allergens
		?.map((a) => allergenMap[a.toLowerCase()] || a.toUpperCase())
		.join(' · ');
</script>

{#if displayList}
	<div class="text-[10px] uppercase text-gray-400 font-medium tracking-wide mt-2">
		{displayList}
	</div>
{/if}
