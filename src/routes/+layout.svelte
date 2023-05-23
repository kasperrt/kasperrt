<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/Header.svelte';
	import Photo from '$lib/Photo.svelte';
	import '../app.css';
	import type { LayoutExport } from './+layout.server';

	 /** @type {import('./$types').PageData} */
	 export let data:LayoutExport;

	const shadowMultiplier = 15;
	const multiplier = 1;
	const meMinimultipler = 5;


	onMount(() => {
		window.addEventListener(
			'deviceorientation',
			(event) => {
				if (!event || !event.beta || !event.gamma) {
					return;
				}

				const x = Math.round(event.gamma * 10) / 10;
				const y = Math.round(event.beta * 10) / 10;

				const movement = 0.5;

				const left = -(x / 10) * movement;
				const top = (y / 10) * movement;

				rotate(-(left - 0.5), -(top - 0.5));
			},
			true
		);
	});

	function meMultiplier() {
		return document.documentElement.clientWidth > 640 ? 40 : 80;
	}

	function rotate(left: number, top: number): void {
		const y = window.scrollY / document.documentElement.clientHeight;
		if (!document) {
			return;
		}

		const leftRotate = document.querySelectorAll<HTMLElement>('.left-rotate');
		const rightRotate = document.querySelectorAll<HTMLElement>('.right-rotate');

		const rotate = [...leftRotate].concat([...rightRotate])
		const shadowContainer = document.querySelectorAll<HTMLElement>('.shadow-container');
		const shadowTransform = document.querySelectorAll<HTMLElement>('.shadow-transform');

		rotate.forEach((element) => {
			element.style.transform = `translate(${left * multiplier}px, ${top * multiplier}px)`;
		});

		shadowContainer.forEach((element) => {
			element.style.transform = `translate(${left * meMinimultipler}px, ${-(
				top * meMinimultipler +
				y * meMultiplier()
			)}px)`;
		});

		shadowTransform.forEach((element) => {
			element.style.boxShadow = `${left * meMinimultipler * shadowMultiplier}px ${
				top * meMinimultipler * shadowMultiplier
			}px #8e8e8e`;
		});
	}

	function handleMouseMove(event: MouseEvent) {
		if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
			return;
		}
		const left = event.clientX / document.documentElement.clientWidth;
		const top = event.clientY / document.documentElement.clientHeight;

		rotate(-(left - 0.5), -(top - 0.5));
	}

	function handleScroll() {
		const y = window.scrollY / document.documentElement.clientHeight;
		const shadowContainer = document.querySelectorAll<HTMLElement>('.shadow-container');
		shadowContainer.forEach((element) => {
			element.style.transform = `translate(0, ${-(y * meMultiplier())}px)`;
		});
	}
</script>

<svelte:window on:scroll={handleScroll} />
<svelte:body on:mousemove={handleMouseMove} />

<Header />

<main>
	<slot />
	<Photo photo={data.photo} />
</main>
