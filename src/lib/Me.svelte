<script lang="ts">
	import { page } from '$app/stores';
	const images: string[] = [
		'/images/me-smile.jpg',
	];
	let chosen: string;

	function choose() {
		chosen = images[Math.floor(Math.random() * images.length)];
	}

	$: $page && choose();
</script>

<div class="image-container shadow-container">
	<img class="shadow-transform" alt="me looking stupid" src={chosen} />
</div>

<style lang="scss">
	.image-container {
		position: fixed;
		top: 10vh;
		right: 200px;
		z-index: -1;
		width: 80%;
		height: 80vh;
		opacity: 0.5;
		transition: transform 0.1s ease 0s;
		display: flex;
		-webkit-box-pack: end;
		justify-content: flex-end;
		-webkit-box-align: center;
		align-items: center;
		margin-right: 5vw;

		img {
			max-height: 80vh;
		}
	}
</style>
