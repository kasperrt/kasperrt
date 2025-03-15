import { NavLink, Outlet } from 'react-router';
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
  return (
    <>
      <header className="fixed top-2.5 right-2.5 z-10 w-2/5 text-right transition-transform">
        <nav>
          <ul>
            <li className="p-2.5">
              <NavLink
                to="/"
                end
                caseSensitive
                className={({ isActive }) =>
                  classNames('font-bold', 'text-2xl', !isActive && 'text-gray-900', isActive && 'text-red-600')
                }
              >
                kasper rynning-tønnesen
              </NavLink>
            </li>
            <li className="p-2.5">
              <NavLink
                to="/cv"
                caseSensitive
                className={({ isActive }) =>
                  classNames('font-bold', 'text-2xl', !isActive && 'text-gray-900', isActive && 'text-red-600')
                }
              >
                cv
              </NavLink>
            </li>
            <li className="p-2.5">
              <a href="https://github.com/kasperrt" className="text-2xl font-bold text-gray-900">
                github
              </a>
            </li>
            <li className="p-2.5">
              <a href="https://www.linkedin.com/in/kasperrt/" className="text-2xl font-bold text-gray-900">
                linkedin
              </a>
            </li>
            <li className="p-2.5">
              <a href="mailto:kasper@rynning-toennesen.email" className="text-2xl font-bold text-gray-900">
                contact
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <div>
        <picture>
          <source type="image/webp" srcSet="/me.webp" />
          <source type="image/png" srcSet="/me.png" />
          <img
            src="/me.png"
            alt="Me smiling"
            className="absolute top-0 right-0 bottom-0 left-0 m-auto h-auto max-w-2/5 opacity-35"
          />
        </picture>
      </div>
      <main className="relative flex min-h-screen">
        <Outlet />
      </main>
    </>
  );
}
