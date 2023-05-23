<script lang="ts">
	export let photo: string;
	
</script>

<div class="image-container shadow-container">
	<img class="shadow-transform" alt="me" src={photo} />
</div>

<style lang="scss">
	.image-container {
		position: fixed;
		top: 10vh;
		right: 200px;
		z-index: -1;
		width: 80%;
		height: 80vh;
		opacity: 0.35;
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

		@media screen and (max-width: 768px) {
			right: 0px;
			top: 20vh;

			img {
				max-height: 50vh;
			}
		}
	}
</style>
