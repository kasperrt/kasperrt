import { NavLink, useViewTransitionState } from 'react-router';
import { Image } from '~/components/Image';
import { classNames } from '~/utils/classNames';
import type { Route } from './+types/route';
import { CVLoader } from './loader';
import { CVMeta } from './meta';

export const loader = CVLoader;
export const meta = CVMeta

export default function CV({ loaderData: { experiences, educations, skills } }: Route.ComponentProps) {
  const isRootTransitioning = useViewTransitionState('/');

  return (
    <div className="mx-auto max-w-4xl p-6 text-xs">
      <section className="mb-5 grid grid-cols-12 gap-x-4">
        <Image
          pictureClass="col-span-2 m-auto md:col-start-2 print:col-start-2"
          alt="Me smiling"
          imageClass={classNames(
            'view-transition-picture min-w-18 min-h-18 max-h-18 max-w-18 md:max-w-32 md:max-h-32 overflow-hidden rounded-full object-cover object-top transition-[border] md:min-w-32 md:min-h-32',
            isRootTransitioning && 'rounded-full',
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
        />
        <div className="col-span-8 col-start-4">
          <h1 className="mb-5 text-left text-2xl font-extrabold">
            <span className="view-transition-title">Kasper Rynning-Tønnesen</span>
          </h1>
          <ul className="mt-2 grid list-none grid-cols-2 gap-2 text-gray-700">
            <li className="flex items-center">Oslo, Norway</li>
            <li className="flex items-center">
              <a href="https://kasperrt.me" className="hidden underline print:inline-block">
                website
              </a>
              <NavLink to="/" viewTransition className="underline print:hidden">
                website
              </NavLink>
            </li>
            <li className="flex items-center">
              <a href="mailto:kasper@rynning-toennesen.email" className="underline">
                kasper@rynning-toennesen.email
              </a>
            </li>
            <li className="flex items-center">
              <a href="https://github.com/kasperrt" className="underline">
                github
              </a>
            </li>
            <li className="flex items-center">
              <a href="tel:004797740427" className="underline">
                +47 977 40 427
              </a>
            </li>
            <li className="flex items-center">
              <a href="https://www.linkedin.com/in/kasperrt/" className="underline">
                linkedin
              </a>
            </li>
          </ul>
        </div>
      </section>
      <section className="mb-5 grid grid-cols-12 gap-x-4">
        <h2 className="col-span-3 text-right text-xl font-extrabold">Experience</h2>
        <div className="col-span-12">
          {experiences.map((experience) => (
            <div key={experience.id} className="print:break-inside-avoid">
              <div className={classNames('grid grid-cols-12 gap-x-4')}>
                <div className="col-span-3 text-right">
                  <p className="text-gray-600">
                    {experience.from}
                    {experience.to && ` - ${experience.to}`}
                  </p>
                </div>
                <div className="col-span-8">
                  {experience.where && <h3 className="font-extrabold">{experience.where}</h3>}
                  {experience.skills && <span className="mb-2 font-light italic">{experience.skills.join(', ')}</span>}
                  {experience.positions?.map((position) => (
                    <h4 key={position} className="font-medium">
                      {position}
                    </h4>
                  ))}
                  {experience.summary && <p className="mb-4 font-light">{experience.summary}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 grid grid-cols-12 gap-x-4">
        <h2 className="col-span-3 text-right text-xl font-extrabold">Skills</h2>
        <ul className="col-span-8 col-start-4 row-start-2 mt-2 flex list-none flex-col gap-x-6 gap-y-2 md:gap-x-4">
          {skills.map(({ area, points }) => (
            <li key={area} className="flex flex-col md:grid md:grid-cols-12">
              <b className="font-extrabold md:col-span-4">{area}:</b>{' '}
              <span className="text-gray-600 md:col-span-8">{points.join(', ')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-5 grid grid-cols-12 gap-x-4">
        <h2 className="col-span-3 mb-4 text-right text-xl font-extrabold">Education</h2>
        <div className="col-span-12">
          {educations.map((education) => (
            <div key={`${education.from}-${education.to}`} className="grid grid-cols-12 gap-x-4">
              <div className="col-span-3 text-right">
                <p className="text-gray-600">
                  {education.from} - {education.to}
                </p>
              </div>
              <div className="col-span-8">
                <h3 className="font-extrabold">{education.where}</h3>
                {education.grades?.map(({ title, grade }) => (
                  <h4 key={title}>
                    {title}
                    {grade && `- Grade ${grade}`}
                  </h4>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
