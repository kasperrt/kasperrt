import { NavLink } from 'react-router';
import { Fragment } from 'react/jsx-runtime';
import { classNames } from '~/utils/classNames';
import type { Route } from './+types/route';
import { CVLoader } from './_loader';
import { CVMeta } from './_meta';

export const loader = CVLoader;
export const meta = CVMeta;

export default function CV({ loaderData: { experiences, educations, skills } }: Route.ComponentProps) {
  return (
    <div className="mx-auto max-w-4xl p-6 text-xs">
      <section className="mb-5 grid grid-cols-12">
        <picture className="col-span-3 m-auto size-20 overflow-hidden rounded-full object-cover md:size-32">
          <source type="image/webp" srcSet="/me.webp" />
          <source type="image/png" srcSet="/me.png" />
          <img src="/me.png" alt="Me smiling" />
        </picture>
        <div className="col-span-8">
          <h1 className="mb-5 text-center text-2xl font-bold">Kasper Rynning-Tønnesen</h1>
          <ul className="mt-2 grid list-none grid-cols-2 gap-2 pl-5 text-gray-700">
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
              <NavLink to="/" className="underline print:hidden">
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
      <section className="mb-5">
        <h2 className="text-xl font-bold">Experience</h2>
        {experiences.map((experience) => (
          <Fragment key={experience.summary}>
            <div
              className={classNames(
                'grid grid-cols-12 gap-x-4',
                experience.where && 'mt-4',
                !experience.where && 'mt-2',
              )}
            >
              <div className="col-span-3">
                <p className="text-gray-600">
                  {experience.from}
                  {experience.to && ` - ${experience.to}`}
                </p>
              </div>
              <div className="col-span-8">
                {experience.where && <h3 className="font-bold">{experience.where}</h3>}
                {experience.positions.map((position) => (
                  <h4 key={position}>{position}</h4>
                ))}
                <p className="mt-2">{experience.summary}</p>
                {experience.skills && <span className="mt-2 block italic">{experience.skills.join(', ')}</span>}
              </div>
            </div>
          </Fragment>
        ))}
      </section>

      <section className="mb-5 grid grid-cols-12">
        <h2 className="col-span-12 text-xl font-bold">Skills</h2>
        <ul className="col-span-8 col-start-4 mt-2 grid list-disc grid-cols-2 gap-x-6 pl-5 text-gray-700 md:grid-cols-3 md:gap-x-4">
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </section>

      <section className="mb-5">
        <h2 className="text-xl font-bold">Education</h2>
        {educations.map((education) => (
          <div key={`${education.from}-${education.to}`} className="mt-4 grid grid-cols-12 gap-x-4">
            <div className="col-span-3">
              <p className="text-gray-600">
                {education.from} - {education.to}
              </p>
            </div>
            <div className="col-span-8">
              <h3 className="font-bold">{education.where}</h3>
              {education.grades.map(({ title, grade }) => (
                <h4 key={title}>
                  {title} - Grade {grade}
                </h4>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
