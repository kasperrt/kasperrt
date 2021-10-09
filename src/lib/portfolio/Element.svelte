<script lang="ts">
	export let header: string;
	export let body: string;
	export let href: string;
	export let img: string = null;
</script>

<section>
	<a {href}>
		<div class="container">
			{#if img}
				<img alt={header} src={img} />
			{/if}
			<div class="text">
				<h3>
					{header}
				</h3>
				<div>
					{#each body as text}
						<p>{text}</p>
					{/each}
				</div>
			</div>
		</div>
	</a>
</section>

<style lang="scss">
	section {
		padding: 20px;
		margin: 20px 0px;
		width: 50vw;
		max-width: 600px;

		a {
			&,
			&:visited,
			&:focus,
			&:active,
			&:focus-visible,
			&:hover {
				color: inherit;
				text-decoration: none;
			}

			.container {
				display: flex;
				-webkit-box-pack: justify;
				justify-content: space-between;
				position: relative;
				cursor: pointer;
				margin-bottom: 40px;
				-webkit-box-align: center;
				align-items: center;

				.text {
					text-align: right;
					width: 30vw;
					line-height: 1.75;

					p {
						transform: translate3d(0px, 0px, 0px);
						-webkit-font-smoothing: antialiased;
						backface-visibility: visible;
					}
				}

				&::after {
					content: ' ';
					width: 20%;
					height: 10px;
					border-bottom: 5px solid rgb(45, 45, 45);
					display: flex;
					position: absolute;
					margin: auto;
					left: 0px;
					bottom: -40px;
					transition: all 0.1s ease 0s;
				}

				&:hover {
					&::after {
						width: 100%;
						border-bottom-color: rgb(229, 57, 53);
					}
				}
			}

			img {
				width: 200px;
				height: 100%;
				object-fit: cover;
				background: rgb(45, 45, 45);
				margin-right: 10px;
			}
		}
	}
</style>
