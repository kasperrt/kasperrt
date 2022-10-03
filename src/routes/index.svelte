<script context="module" lang="ts">
	export const prerender = true;
</script>

<svelte:head>
	<title>kasperrt</title>
</svelte:head>

<section class="left-rotate">
	<h1>👋 hi</h1>

	<p>
		my name is kasper, and i am a lead architect at cybr. i have worked with a range
		of technologies, all from episerver, c# and .net, to golang, svelte, react, vue.js, and mongodb,
		and a bunch more.
	</p>
	<p>programming is one of my hobbies, so i made this to showcase some of my stuff.</p>
	<p>
		want to get to know me?
		<br />
		<a href="mailto:kasper@rynning-toennesen.no"> kasper@rynning-toennesen.no </a>
	</p>
</section>

<style lang="scss">
	section {
		width: 60vw;
		text-align: left;
		padding-left: 20px;
		height: 100vh;
		margin-top: -23px;
		display: flex;
		flex-direction: column;
		-webkit-box-pack: center;
		justify-content: center;
		line-height: 1.75;
		-webkit-font-smoothing: antialiased;
		transform: translate3d(0px, 0px, 0px);
	}
</style>
