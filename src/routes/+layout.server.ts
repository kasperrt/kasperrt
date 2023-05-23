export interface LayoutExport {
    photo: string
}

/** @type {import('./$types').LayoutLoad} */
export function load():LayoutExport {
    const images: string[] = [
		'/images/me-smile.jpg',
	];

    return {
        photo: images[Math.floor(Math.random() * images.length)]
    };
}