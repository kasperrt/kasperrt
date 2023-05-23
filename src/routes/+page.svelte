<svelte:head>
	<title>kasperrt</title>
</svelte:head>

<section class="left-rotate">
	<h1>👋 hi</h1>

	<p>
		I am Kasper and I currently work as the VP of Engineering at Pistachio, a
		tech startup in Norway. Prior to this I worked as the Lead Architect at Aller Media.
	</p>
	<p>
		I have worked with a range of technologies from golang, react, postgresql - to svelte, c#, mongodb and <a href="https://kasper.rynning-toennesen.no?lang=en">a bunch more</a
		>.
	</p>
	<p>
		Want to get to know me or connect?
		<br />
		<a href="mailto:kasper@rynning-toennesen.no">kasper@rynning-toennesen.no</a>
	</p>
</section>

<style lang="scss">
	section {
		width: 45vw;
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

		@media screen and (max-width: 768px) {
			width: 60vw;
		}
	}
</style>
