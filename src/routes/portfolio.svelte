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
	<p>
		more works, projects and employments, see my
		<a href="https://kasper.rynning-toennesen.no">cv</a>.
	</p>
</section>

<style lang="scss">
	section {
		width: 60vw;
		margin-top: 3rem;
		margin-left: 30px;
		transform: translate3d(0px, 0px, 0px);
		-webkit-font-smoothing: antialiased;

		@media screen and (max-width: 860px) {
			width: 100vw;
			margin-right: 0px;
			margin-left: 0px;
			padding-bottom: 50px;
		}

		h2 {
			@media screen and (max-width: 860px) {
				width: auto;
				max-width: 100%;
				padding: 0px 20px 0px 0px;
				display: flex;
				flex-direction: row-reverse;
			}
		}

		p {
			@media screen and (max-width: 860px) {
				padding: 20px;
				text-align: right;
			}
		}
	}
</style>
