import type { MetaDescriptor } from 'react-router';

export function CVMeta(): MetaDescriptor[] {
  return [
    { title: 'Kasper Rynning-Tønnesen | More' },
    {
      name: 'description',
      content:
        'View the resume of Kasper Rynning-Tønnesen, a software engineer with experience in full-stack development, React, and scalable web architecture. Explore career highlights, technical skills, and projects.',
    },
    {
      name: 'keywords',
      content:
        'Kasper Rynning-Tønnesen, resume, CV, software engineer, web developer, React, JavaScript, TypeScript, full-stack developer, tech portfolio, professional experience',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: 'Kasper Rynning-Tønnesen | More',
    },
    {
      property: 'og:description',
      content:
        'View the resume of Kasper Rynning-Tønnesen, a software engineer with experience in full-stack development, React, and scalable web architecture. Explore career highlights, technical skills, and projects.',
    },
    {
      property: 'og:image',
      content: '/me.png',
    },
    {
      property: 'og:url',
      content: 'https://kasperrt.me/more',
    },
  ];
}
