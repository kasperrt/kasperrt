<script lang="ts">
	import { page } from '$app/stores';

	export const prerender = true;
</script>

<header class="right-rotate">
	<nav>
		<ul>
			<li>
				<a class:active={$page.path === '/'} sveltekit:prefetch href="/">kasper rynning-tønnesen</a>
			</li>
			<li>
				<!-- <a class:active={$page.path === '/cv'} sveltekit:prefetch href="/cv">cv</a> -->
				<a href="https://kasper.rynning-toennesen.no">cv</a>
			</li>
			<li>
				<a href="https://github.com/kasperrt">github</a>
			</li>
			<li>
				<a href="https://www.linkedin.com/in/kasper-rynning-t%C3%B8nnesen-101aab95/">linkedin</a>
			</li>
			<li>
				<a href="mailto:kasper@rynning-toennesen.no">contact</a>
			</li>
		</ul>
	</nav>
</header>

<style lang="scss">
	header {
		position: fixed;
		top: 10px;
		right: 10px;
		width: 40vw;
		transition: transform 0.1s ease 0s;
		transform: translate3d(0px, 0px, 0px);
		-webkit-font-smoothing: antialiased;

		nav {
			ul {
				list-style: none;
				height: 80vh;
				display: flex;
				flex-direction: column;

				li {
					list-style: none;
					text-align: right;
					padding: 10px;
					font-weight: bold;
					font-size: 1.5rem;
					display: flex;
					-webkit-box-pack: end;
					justify-content: flex-end;

					a {
						transition: all 0.1s ease 0s;
						text-decoration: none;
						display: flex;
						flex-direction: column;
						position: relative;
						text-transform: lowercase;
						color: #2d2d2d;

						&:visited,
						&:focus {
							color: #2d2d2d;
						}

						&::after {
							content: ' ';
							border-bottom: 2px solid rgb(45, 45, 45);
							padding-bottom: 4px;
							width: 0px;
							transition: all 0.1s ease 0s;
							display: flex;
							flex-direction: row-reverse;
							position: absolute;
							right: 0px;
							bottom: -5px;
						}

						&.active,
						&:hover {
							color: rgb(229, 57, 53);
						}

						&:hover {
							&::after {
								width: 100%;
							}
						}
					}
				}
			}
		}
	}
</style>
