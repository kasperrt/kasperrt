import { useRef, useState } from 'react';
import { NavLink, Outlet, useViewTransitionState, type MetaDescriptor } from 'react-router';
import { Image } from '~/components/Image';
import { Underline } from '~/components/Underline';
import { useRotate } from '~/hooks/useRotate';
import { classNames } from '~/utils/classNames';

export function meta(): MetaDescriptor[] {
  return [
    { title: 'Kasper Rynning-Tønnesen' },
    {
      name: 'description',
      content: "Hi, I'm Kasper, a developer and engineer. Welcome to my personal website, where you can learn more about my projects, expertise, and experience in the tech industry.",
    },
    {
      name: 'keywords',
      content: "Kasper Rynning-Tønnesen, developer, engineer, tech professional, web development, React, JavaScript, software engineering",
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
      content: "Hi, I'm Kasper. Explore my personal site to learn more about my work and the technologies I specialize in.",
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

export default function RootLayout() {
  const imageRef = useRef<HTMLImageElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const isMoreTransitioning = useViewTransitionState('/more');
  const [loadedImage, setLoadedImage] = useState<boolean>(false);

  const onImageLoaded = () => {
    setLoadedImage(true);
  };

  useRotate({
    elements: [
      { multiplier: -0.5, ref: headerRef },
      { multiplier: 4, shadow: { multiplier: 5 }, ref: imageRef },
    ],
  });

  return (
    <>
      <header ref={headerRef} className="top-2.5 right-2.5 z-10 text-right md:fixed md:w-2/5">
        <nav>
          <ul>
            <li className="p-2.5">
              <NavLink
                to="/"
                className={({ isActive }) => classNames('text-2xl font-bold', isActive && 'text-red-600')}
              >
                <Underline>
                  <span className="view-transition-title lowercase">Kasper Rynning-Tønnesen</span>
                </Underline>
              </NavLink>
            </li>
            <li className="p-2.5">
              <NavLink
                to="/more"
                viewTransition
                className={({ isActive }) => classNames('text-2xl font-bold', isActive && 'text-red-600')}
              >
                <Underline>cv</Underline>
              </NavLink>
            </li>
            <li className="p-2.5">
              <a href="https://github.com/kasperrt" className="group text-2xl font-bold">
                <Underline>github</Underline>
              </a>
            </li>
            <li className="p-2.5">
              <a href="https://www.linkedin.com/in/kasperrt/" className="group text-2xl font-bold">
                <Underline>linkedin</Underline>
              </a>
            </li>
            <li className="p-2.5">
              <a href="mailto:kasper@rynning-toennesen.email" className="group text-2xl font-bold">
                <Underline>contact</Underline>
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <Image
        alt="Me smiling"
        ref={imageRef}
        onLoad={onImageLoaded}
        imageClass={classNames(
          'view-transition-picture absolute -top-2/5 bottom-0 left-1/5 m-auto h-[fit-content,_min-content,_auto] max-h-3/5 max-w-2/5 opacity-100 transition-[border,opacity] md:fixed md:top-0 md:left-1/2 md:max-h-4/5 md:max-w-2/5 md:opacity-35',
          isMoreTransitioning && 'rounded-none',
        )}
        sources={[
          {
            type: 'image/webp',
            srcSet: '/me.webp',
          },
          {
            type: 'image/png',
            srcSet: '/me.png',
          },
        ]}
        {...(loadedImage && {
          style: {
            boxShadow: 'rgb(141, 141, 141) 9.91031px 9.61118px',
          },
        })}
      />

      <main className="relative flex flex-1 md:min-h-svh">
        <Outlet />
      </main>
    </>
  );
}
