<script lang="ts">
	import { isPreviewing, VisualEditing } from '@sanity/visual-editing/svelte';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';
	import LiveMode from '../components/LiveMode.svelte';
	import '../app.css';
	import 'remixicon/fonts/remixicon.css';
</script>

{#if $isPreviewing}
	<a href={`/preview/disable?redirect=${$page.url.pathname}`} class="preview-toggle">
		<span>Preview Enabled</span>
		<span>Disable Preview</span>
	</a>
{/if}

<div class="flex h-full min-h-screen flex-col bg-white text-brand-blue antialiased font-sans">
	{#if $isPreviewing}
		<a href={`/preview/disable?redirect=${$page.url.pathname}`} class="preview-toggle">
			<span>Preview Enabled</span>
			<span>Disable Preview</span>
		</a>
	{/if}

	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white">
		<div class="mx-auto px-4 py-5 sm:px-6 lg:px-8 max-w-2xl justify-center items-center flex">
			<a href="/">
				<img class="w-32" src="./logo.webp" alt="Bodega La Pascuala">
			</a>
		</div>
	</header>

	<main class="flex-1 mx-auto w-full max-w-7xl md:px-4 md:py-8 sm:px-6 lg:px-8">
		{#key $page.url.pathname}
			<div in:fade={{ duration: 300, delay: 0 }}>
				<slot />
			</div>
		{/key}
	</main>

</div>

{#if $isPreviewing}
	<VisualEditing />
	<LiveMode />
{/if}
