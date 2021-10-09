<script lang="ts">
	import { page } from '$app/stores';
	const images: string[] = [
		'/images/me-dumb.jpeg',
		'/images/me-glad.jpeg',
		'/images/me-spaghetti.jpeg'
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
		transition: transform 0.1s ease 0s;
		display: flex;
		-webkit-box-pack: end;
		justify-content: flex-end;
		-webkit-box-align: center;
		align-items: center;
		margin-right: 5vw;

		@media screen and (max-width: 860px) {
			top: 30vh;
			margin-right: -20vw;
		}

		img {
			max-height: 80vh;

			@media screen and (max-width: 860px) {
				opacity: 0.5;
				max-width: 95vw;
				right: 15vw;
				top: 30vh;
			}
		}
	}
</style>
