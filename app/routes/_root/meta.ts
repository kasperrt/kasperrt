import type { MetaDescriptor } from 'react-router';

export function rootMeta(): MetaDescriptor[] {
  return [
    { title: 'Kasper Rynning-Tønnesen' },
    {
      name: 'description',
      content:
        "Hi, I'm Kasper, a developer and engineer. Welcome to my personal website, where you can learn more about my projects, expertise, and experience in the tech industry.",
    },
    {
      name: 'keywords',
      content:
        'Kasper Rynning-Tønnesen, developer, engineer, tech professional, web development, React, JavaScript, software engineering',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: 'Kasper Rynning-Tønnesen',
    },
    {
      property: 'og:description',
      content:
        "Hi, I'm Kasper. Explore my personal site to learn more about my work and the technologies I specialize in.",
    },
    {
      property: 'og:image',
      content: '/me.png',
    },
    {
      property: 'og:url',
      content: 'https://kasperrt.me',
    },
  ];
}
