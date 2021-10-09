<script context="module" lang="ts">
	// @ts-ignore
	import type { IProject } from '$interface/IProject';
	import * as portfolioData from '$lib/portfolio/data.json';
	import Element from '$lib/portfolio/Element.svelte';

	// export const router = browser;
	export const prerender = true;

	let portfolio: IProject[] = portfolioData.default;
</script>

<svelte:head>
	<title>portfolio</title>
</svelte:head>

<section class="left-rotate">
	<h2>independent works</h2>
	{#each portfolio as project}
		<Element {...project} />
	{/each}
</section>

<style lang="scss">
	section {
		width: 60vw;
		margin-top: 3rem;
		margin-left: 30px;
		transform: translate3d(0px, 0px, 0px);
		-webkit-font-smoothing: antialiased;
	}
</style>
