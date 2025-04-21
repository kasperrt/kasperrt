import { NavLink, useViewTransitionState } from 'react-router';
import { classNames } from '~/utils/classNames';
import type { Route } from './+types/route';
import { CVLoader } from './_loader';
import { CVMeta } from './_meta';

export const loader = CVLoader;
export const meta = CVMeta;

export default function CV({ loaderData: { experiences, educations, skills } }: Route.ComponentProps) {
  const isRootTransitioning = useViewTransitionState('/');

  return (
    <div className="mx-auto max-w-4xl p-6 text-xs">
      <section className="mb-5 grid grid-cols-12 gap-x-4">
        <picture className="col-span-2 m-auto md:col-start-2 print:col-start-2">
          <source type="image/webp" srcSet="/me.webp" />
          <source type="image/png" srcSet="/me.png" />
          <img
            src="/me.png"
            alt="Me smiling"
            className={classNames(
              'view-transition-picture size-18 overflow-hidden rounded-full object-cover object-top transition-all md:size-32',
              isRootTransitioning && 'rounded-full',
            )}
          />
        </picture>
        <div className="col-span-8 col-start-4">
          <h1 className="mb-5 text-left text-2xl font-extrabold">
            <span className="view-transition-title">Kasper Rynning-Tønnesen</span>
          </h1>
          <ul className="mt-2 grid list-none grid-cols-2 gap-2 text-gray-700">
            <li>
              <a href="mailto:kasper@rynning-toennesen.email" className="underline">
                kasper@rynning-toennesen.email
              </a>
            </li>
            <li>
              <a href="tel:004797740427" className="underline">
                +47 977 40 427
              </a>
            </li>
            <li>
              website:{' '}
              <a href="https://kasperrt.me" className="hidden underline print:block">
                kasperrt.me
              </a>
              <NavLink to="/" viewTransition className="underline print:hidden">
                kasperrt.me
              </NavLink>
            </li>
            <li>Oslo, Norway</li>
            <li>
              github:{' '}
              <a href="https://github.com/kasperrt" className="underline">
                kasperrt
              </a>
            </li>
            <li>
              linkedin:{' '}
              <a href="https://www.linkedin.com/in/kasperrt/" className="underline">
                kasperrt
              </a>
            </li>
          </ul>
        </div>
      </section>
      <section className="mb-5 grid grid-cols-12 gap-x-4">
        <h2 className="col-span-3 text-right text-xl font-extrabold">Experience</h2>
        <div className="col-span-12">
          {experiences.map((experience) => (
            <div key={JSON.stringify(experience)} className="print:break-inside-avoid">
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
        <ul className="col-span-8 col-start-4 row-start-2 mt-2 grid list-disc grid-cols-2 gap-x-6 pl-5 text-gray-700 md:grid-cols-3 md:gap-x-4">
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
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
                    {title} - Grade {grade}
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
