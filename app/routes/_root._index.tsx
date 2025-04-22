import { useRef } from 'react';
import { NavLink } from 'react-router';
import { useRotate } from '~/hooks/useRotate';

export default function Index() {
  const textRef = useRef<HTMLElement>(null);

  useRotate({ elements: [{ multiplier: -0.5, ref: textRef }] });

  return (
    <section ref={textRef} className="flex flex-col gap-y-6 self-center pr-6 pl-5 font-light md:w-2/5">
      <h1 className="py-4 text-2xl font-bold">hi 👋</h1>
      <p>
        I'm Kasper, currently working as VP of Engineering at Pistachio — a tech startup in Norway. Before this, I was
        Lead Architect at Aller Media.
      </p>
      <p>
        I've worked with a bunch of different technologies over the years — from Go, React, and PostgreSQL to Svelte,
        C#, MongoDB, and 
        <NavLink className="text-red-600" to="/more">
          a bunch more
        </NavLink>
        .
      </p>
      <p>
        Want to get in touch or connect?
        <br />
        <a className="text-red-600" href="mailto:kasper@rynning-toennesen.email">
          kasper@rynning-toennesen.email
        </a>
      </p>
    </section>
  );
}
