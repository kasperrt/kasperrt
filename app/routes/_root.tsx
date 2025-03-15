import { useRef } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useRotate } from '~/hooks/useRotate';
import { classNames } from '~/utils/classNames';
import type { Route } from './+types/_root';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'kasper rynning-tønnesen' },
    {
      name: 'description',
      content: "hi, i'm kasper and welcome to my webpage 👋",
    },
  ];
}

export default function RootLayout() {
  const imageRef = useRef<HTMLImageElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useRotate({
    elements: [
      { multiplier: -0.5, ref: headerRef },
      { multiplier: 4, shadow: { multiplier: 5 }, ref: imageRef },
    ],
  });

  return (
    <>
      <header ref={headerRef} className="fixed top-2.5 right-2.5 z-10 w-2/5 text-right">
        <nav>
          <ul>
            <li className="p-2.5">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  classNames(
                    'group text-2xl font-bold transition-all duration-300 ease-in-out',
                    !isActive && 'text-gray-900',
                    isActive && 'text-red-600',
                  )
                }
              >
                <span className="bg-gradient-to-l from-red-600 to-red-600 bg-[length:0%_2px] bg-right-bottom bg-no-repeat pb-1 transition-all duration-500 ease-out group-hover:bg-[length:100%_2px]">
                  kasper rynning-tønnesen
                </span>
              </NavLink>
            </li>
            <li className="p-2.5">
              <NavLink
                to="/cv"
                className={({ isActive }) =>
                  classNames(
                    'group text-2xl font-bold transition-all duration-300 ease-in-out',
                    !isActive && 'text-gray-900',
                    isActive && 'text-red-600',
                  )
                }
              >
                <span className="bg-gradient-to-l from-red-600 to-red-600 bg-[length:0%_2px] bg-right-bottom bg-no-repeat pb-1 transition-all duration-500 ease-out group-hover:bg-[length:100%_2px]">
                  cv
                </span>
              </NavLink>
            </li>
            <li className="p-2.5">
              <a
                href="https://github.com/kasperrt"
                className="group text-2xl font-bold text-gray-900 transition-all duration-300 ease-in-out"
              >
                <span className="bg-gradient-to-l from-red-600 to-red-600 bg-[length:0%_2px] bg-right-bottom bg-no-repeat pb-1 transition-all duration-500 ease-out group-hover:bg-[length:100%_2px]">
                  github
                </span>
              </a>
            </li>
            <li className="p-2.5">
              <a
                href="https://www.linkedin.com/in/kasperrt/"
                className="group text-2xl font-bold text-gray-900 transition-all duration-300 ease-in-out"
              >
                <span className="bg-gradient-to-l from-red-600 to-red-600 bg-[length:0%_2px] bg-right-bottom bg-no-repeat pb-1 transition-all duration-500 ease-out group-hover:bg-[length:100%_2px]">
                  linkedin
                </span>
              </a>
            </li>
            <li className="p-2.5">
              <a
                href="mailto:kasper@rynning-toennesen.email"
                className="group text-2xl font-bold text-gray-900 transition-all duration-300 ease-in-out"
              >
                <span className="bg-gradient-to-l from-red-600 to-red-600 bg-[length:0%_2px] bg-right-bottom bg-no-repeat pb-1 transition-all duration-500 ease-out group-hover:bg-[length:100%_2px]">
                  contact
                </span>
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <picture>
        <source type="image/webp" srcSet="/me.webp" />
        <source type="image/png" srcSet="/me.png" />
        <img
          ref={imageRef}
          src="/me.png"
          alt="Me smiling"
          className="absolute top-0 bottom-0 left-1/2 m-auto h-auto max-h-4/5 max-w-2/5 opacity-35"
        />
      </picture>

      <main className="relative flex min-h-screen">
        <Outlet />
      </main>
    </>
  );
}
